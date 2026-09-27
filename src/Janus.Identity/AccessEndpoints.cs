using Janus.Identity.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace Janus.Identity;

public static partial class AccessEndpoints
{
    internal const string SharedAdministratorRole = "SharedAdministrator";
    private const string Pending = "Pending";
    private const string Approved = "Approved";
    private const string Rejected = "Rejected";

    public static void MapAccessEndpoints(this WebApplication app)
    {
        app.MapGet("/products/{productId}", async (string productId, IdentityDataContext data) =>
        {
            var product = await data.Products.AsNoTracking()
                .Where(item => item.Id == productId)
                .Select(item => new { item.Id, item.Name }).SingleOrDefaultAsync();
            return product is null ? Results.NotFound() : Results.Ok(product);
        });
        app.MapPost("/admin/products", CreateProductAsync).RequireAuthorization()
            .RequireRateLimiting("account-write");
        app.MapPost("/admin/administrators", AppointAdministratorAsync).RequireAuthorization()
            .RequireRateLimiting("account-write");
        app.MapGet("/admin/access-requests", ListManagedRequestsAsync).RequireAuthorization();
        app.MapGet("/admin/products/{productId}/grants", ListGrantsAsync).RequireAuthorization();
        app.MapPost("/admin/access-requests/{id:guid}/approve", ApproveAsync).RequireAuthorization()
            .RequireRateLimiting("account-write");
        app.MapPost("/admin/access-requests/{id:guid}/reject", RejectAsync).RequireAuthorization()
            .RequireRateLimiting("account-write");
        app.MapPost("/admin/products/{productId}/grants/{userId}/revoke", RevokeAsync)
            .RequireAuthorization().RequireRateLimiting("account-write");
        app.MapPost("/products/{productId}/access-requests", RequestAccessAsync)
            .RequireAuthorization().RequireRateLimiting("account-write");
        app.MapGet("/account/access-requests", ListOwnRequestsAsync).RequireAuthorization();
        app.MapGet("/account/access/{productId}", CheckAccessAsync).RequireAuthorization();
    }

    internal static async Task<bool> CanManageProductAsync(
        IdentityDataContext data, UserManager<JanusUser> users, JanusUser user, string productId)
    {
        return await users.IsInRoleAsync(user, SharedAdministratorRole)
            || await data.ProductAdministrators.AnyAsync(administrator =>
                administrator.UserId == user.Id && administrator.ProductId == productId);
    }

    private static async Task<IResult> CreateProductAsync(
        ProductRequest request, HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var user = await users.GetUserAsync(context.User);
        if (user is null || !await users.IsInRoleAsync(user, SharedAdministratorRole)) return Results.Forbid();
        var id = request.Id?.Trim();
        var name = request.Name?.Trim();
        if (id is null || !ProductIdPattern().IsMatch(id) || string.IsNullOrWhiteSpace(name) || name.Length > 100)
            return Results.BadRequest(new { message = "Provide a product ID using lowercase letters, digits, and hyphens, and a nonblank name of at most 100 characters." });
        if (await data.Products.AnyAsync(product => product.Id == id))
            return Results.Conflict(new { message = "That product ID is already registered." });
        data.Products.Add(new Product { Id = id, Name = name });
        try { await data.SaveChangesAsync(); }
        catch (DbUpdateException) { return Results.Conflict(new { message = "That product ID is already registered." }); }
        return Results.Created($"/products/{id}", new { id, name });
    }

    private static async Task<IResult> AppointAdministratorAsync(
        AdministratorRequest request, HttpContext context, IdentityDataContext data,
        UserManager<JanusUser> users, RoleManager<IdentityRole> roles)
    {
        var actor = await users.GetUserAsync(context.User);
        if (actor is null || !await users.IsInRoleAsync(actor, SharedAdministratorRole)) return Results.Forbid();
        if (string.IsNullOrWhiteSpace(request.Identifier))
            return Results.BadRequest(new { message = "A username or email address is required." });
        var identifier = request.Identifier.Trim();
        var target = identifier.Contains('@')
            ? await users.FindByEmailAsync(identifier)
            : await users.FindByNameAsync(identifier);
        if (target is null || !target.EmailConfirmed) return Results.NotFound();

        if (request.ProductId is null)
        {
            if (!await roles.RoleExistsAsync(SharedAdministratorRole))
            {
                var created = await roles.CreateAsync(new IdentityRole(SharedAdministratorRole));
                if (!created.Succeeded) return Results.Problem("Could not create the shared administrator role.");
            }
            if (!await users.IsInRoleAsync(target, SharedAdministratorRole))
            {
                var assigned = await users.AddToRoleAsync(target, SharedAdministratorRole);
                if (!assigned.Succeeded) return Results.Problem("Could not appoint the shared administrator.");
            }
            return Results.Ok(new { userId = target.Id, role = SharedAdministratorRole });
        }

        var productId = request.ProductId.Trim();
        if (!await data.Products.AnyAsync(product => product.Id == productId))
            return Results.BadRequest(new { message = "Unknown product." });
        if (!await data.ProductAdministrators.AnyAsync(administrator =>
            administrator.UserId == target.Id && administrator.ProductId == productId))
        {
            data.ProductAdministrators.Add(new ProductAdministrator
            {
                UserId = target.Id,
                ProductId = productId,
                AppointedAtUtc = DateTime.UtcNow,
            });
            try { await data.SaveChangesAsync(); }
            catch (DbUpdateException) { /* Another appointment won the unique-key race. */ }
        }
        return Results.Ok(new { userId = target.Id, productId, role = "ProductAdministrator" });
    }

    private static async Task<IResult> RequestAccessAsync(
        string productId, HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var user = await users.GetUserAsync(context.User);
        if (user is null) return Results.Unauthorized();
        if (!await data.Products.AnyAsync(product => product.Id == productId)) return Results.NotFound();
        if (await data.ProductGrants.AnyAsync(grant => grant.UserId == user.Id && grant.ProductId == productId))
            return Results.Conflict(new { message = "You already have access to this product." });
        if (await data.ProductAccessRequests.AnyAsync(request => request.UserId == user.Id
            && request.ProductId == productId && request.Status == Pending))
            return Results.Conflict(new { message = "An access request is already pending." });

        var accessRequest = new ProductAccessRequest
        {
            Id = Guid.NewGuid(), UserId = user.Id, ProductId = productId, Status = Pending,
            CreatedAtUtc = DateTime.UtcNow,
        };
        data.ProductAccessRequests.Add(accessRequest);
        try { await data.SaveChangesAsync(); }
        catch (DbUpdateException) { return Results.Conflict(new { message = "An access request is already pending." }); }
        return Results.Created($"/account/access-requests", new
        {
            accessRequest.Id, accessRequest.ProductId, accessRequest.Status, accessRequest.CreatedAtUtc,
        });
    }

    private static async Task<IResult> ListOwnRequestsAsync(
        HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var user = await users.GetUserAsync(context.User);
        if (user is null) return Results.Unauthorized();
        var requests = await data.ProductAccessRequests.AsNoTracking()
            .Where(request => request.UserId == user.Id)
            .OrderByDescending(request => request.CreatedAtUtc)
            .Select(request => new
            {
                request.Id, request.ProductId, request.Status, request.CreatedAtUtc, request.ResolvedAtUtc,
            }).ToListAsync();
        return Results.Ok(requests);
    }

    private static async Task<IResult> CheckAccessAsync(
        string productId, HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var user = await users.GetUserAsync(context.User);
        if (user is null) return Results.Unauthorized();
        if (!await data.Products.AnyAsync(product => product.Id == productId)) return Results.NotFound();
        // Always read the current grant; a cookie issued before revocation is not sufficient.
        return await data.ProductGrants.AsNoTracking().AnyAsync(grant =>
            grant.UserId == user.Id && grant.ProductId == productId)
            ? Results.Ok(new { userId = user.Id, productId, authorized = true })
            : Results.Forbid();
    }

    private static async Task<IResult> ListManagedRequestsAsync(
        HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var actor = await users.GetUserAsync(context.User);
        if (actor is null) return Results.Unauthorized();
        var shared = await users.IsInRoleAsync(actor, SharedAdministratorRole);
        string[] managedProducts = shared
            ? []
            : await data.ProductAdministrators.AsNoTracking()
                .Where(administrator => administrator.UserId == actor.Id)
                .Select(administrator => administrator.ProductId).ToArrayAsync();
        if (!shared && managedProducts.Length == 0) return Results.Forbid();

        var query = from request in data.ProductAccessRequests.AsNoTracking()
                    join user in data.Users.AsNoTracking() on request.UserId equals user.Id
                    select new { Request = request, UserName = user.UserName, Email = user.Email };
        if (!shared) query = query.Where(item => managedProducts.Contains(item.Request.ProductId));
        var requests = await query.OrderByDescending(item => item.Request.CreatedAtUtc)
            .Select(item => new
            {
                item.Request.Id, item.Request.ProductId, item.Request.UserId,
                item.UserName, item.Email, item.Request.Status, item.Request.CreatedAtUtc,
                item.Request.ResolvedAtUtc,
            }).ToListAsync();
        return Results.Ok(requests);
    }

    private static async Task<IResult> ListGrantsAsync(
        string productId, HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var actor = await users.GetUserAsync(context.User);
        if (actor is null || !await CanManageProductAsync(data, users, actor, productId))
            return Results.Forbid();
        if (!await data.Products.AnyAsync(product => product.Id == productId)) return Results.NotFound();
        var grants = await (from grant in data.ProductGrants.AsNoTracking()
                            join user in data.Users.AsNoTracking() on grant.UserId equals user.Id
                            where grant.ProductId == productId
                            orderby user.UserName
                            select new
                            {
                                user.Id, user.UserName, user.Email, grant.ProductId, grant.GrantedAtUtc,
                            }).ToListAsync();
        return Results.Ok(grants);
    }

    private static Task<IResult> ApproveAsync(
        Guid id, HttpContext context, IdentityDataContext data, UserManager<JanusUser> users) =>
        ResolveAsync(id, Approved, context, data, users);

    private static Task<IResult> RejectAsync(
        Guid id, HttpContext context, IdentityDataContext data, UserManager<JanusUser> users) =>
        ResolveAsync(id, Rejected, context, data, users);

    private static async Task<IResult> ResolveAsync(
        Guid id, string outcome, HttpContext context, IdentityDataContext data, UserManager<JanusUser> users)
    {
        var actor = await users.GetUserAsync(context.User);
        if (actor is null) return Results.Unauthorized();
        var request = await data.ProductAccessRequests.FindAsync(id);
        if (request is null) return Results.NotFound();
        if (!await CanManageProductAsync(data, users, actor, request.ProductId)) return Results.Forbid();
        if (outcome == Approved && request.UserId == actor.Id
            && !await users.IsInRoleAsync(actor, SharedAdministratorRole))
            return Results.Forbid();
        await using var transaction = await data.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;
        var transitioned = await data.ProductAccessRequests
            .Where(item => item.Id == id && item.Status == Pending)
            .ExecuteUpdateAsync(update => update
                .SetProperty(item => item.Status, outcome)
                .SetProperty(item => item.ResolvedAtUtc, now)
                .SetProperty(item => item.ResolvedByUserId, actor.Id));
        if (transitioned == 0)
        {
            await transaction.RollbackAsync();
            return Results.Conflict(new { message = "This request is no longer pending." });
        }
        if (outcome == Approved && !await data.ProductGrants.AnyAsync(grant =>
            grant.UserId == request.UserId && grant.ProductId == request.ProductId))
        {
            data.ProductGrants.Add(new ProductGrant
            {
                UserId = request.UserId,
                ProductId = request.ProductId,
                GrantedAtUtc = DateTime.UtcNow,
            });
        }
        await data.SaveChangesAsync();
        await transaction.CommitAsync();
        return Results.Ok(new { request.Id, request.ProductId, request.UserId, status = outcome });
    }

    private static async Task<IResult> RevokeAsync(
        string productId, string userId, HttpContext context, IdentityDataContext data,
        UserManager<JanusUser> users)
    {
        var actor = await users.GetUserAsync(context.User);
        if (actor is null || !await CanManageProductAsync(data, users, actor, productId))
            return Results.Forbid();
        var grant = await data.ProductGrants.FindAsync(userId, productId);
        if (grant is null) return Results.NotFound();
        data.ProductGrants.Remove(grant);
        try { await data.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { return Results.NotFound(); }
        return Results.Ok(new { userId, productId, revoked = true });
    }

    [GeneratedRegex("^[a-z0-9][a-z0-9-]{0,63}$")]
    private static partial Regex ProductIdPattern();

    private sealed record ProductRequest(string? Id, string? Name);
    private sealed record AdministratorRequest(string? Identifier, string? ProductId);
}
