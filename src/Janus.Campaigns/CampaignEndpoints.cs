using Janus.Campaigns.Persistence;
using Janus.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Janus.Campaigns;

internal static class CampaignEndpoints
{
    public static void MapCampaignEndpoints(this WebApplication app)
    {
        var campaigns = app.MapGroup("/campaigns");
        campaigns.MapGet("/", ListAsync);
        campaigns.MapPost("/", CreateAsync);
        campaigns.MapGet("/{campaignId:guid}", GetAsync);
        campaigns.MapPost("/{campaignId:guid}/characters", AddCharacterAsync);
        campaigns.MapPatch("/{campaignId:guid}/characters/{characterId:guid}/name", ChangeNameAsync);
        campaigns.MapPatch("/{campaignId:guid}/characters/{characterId:guid}/kind", ChangeKindAsync);
        campaigns.MapDelete("/{campaignId:guid}/characters/{characterId:guid}", RemoveCharacterAsync);
    }

    private static async Task<IResult> ListAsync(
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var campaigns = await data.Campaigns.AsNoTracking()
            .Where(campaign => campaign.OwnerUserId == session.Profile.UserId)
            .Select(campaign => new { campaign.Id, campaign.Name, campaign.CreatedAtUtc })
            .ToListAsync(cancellationToken);
        return Results.Ok(campaigns.OrderByDescending(campaign => campaign.CreatedAtUtc));
    }

    private static async Task<IResult> CreateAsync(
        CampaignNameRequest request, HttpContext context, CampaignAccessService access,
        CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { message = "Campaign name is required." });
        var campaign = new Campaign
        {
            Id = Guid.NewGuid(),
            OwnerUserId = session.Profile.UserId,
            Name = request.Name.Trim(),
            CreatedAtUtc = DateTimeOffset.UtcNow,
        };
        data.Campaigns.Add(campaign);
        await data.SaveChangesAsync(cancellationToken);
        return Results.Created($"/campaigns/{campaign.Id}",
            new { campaign.Id, campaign.Name, campaign.CreatedAtUtc });
    }

    private static async Task<IResult> GetAsync(
        Guid campaignId, HttpContext context, CampaignAccessService access,
        CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var campaign = await data.Campaigns.AsNoTracking()
            .SingleOrDefaultAsync(campaign => campaign.Id == campaignId
                && campaign.OwnerUserId == session.Profile.UserId, cancellationToken);
        if (campaign is null) return Results.NotFound();
        var characters = await data.Characters.AsNoTracking()
            .Where(character => character.CampaignId == campaignId)
            .OrderBy(character => character.Name)
            .Select(character => new { character.Id, character.Name, character.Kind })
            .ToListAsync(cancellationToken);
        return Results.Ok(new { campaign.Id, campaign.Name, campaign.CreatedAtUtc, characters });
    }

    private static async Task<IResult> AddCharacterAsync(
        Guid campaignId, CharacterRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (!await OwnsCampaignAsync(data, campaignId, session.Profile.UserId, cancellationToken))
            return Results.NotFound();
        if (string.IsNullOrWhiteSpace(request.Name) || !ParseKind(request.Kind, out var kind))
            return Results.BadRequest(new { message = "A nonblank character name and PC or NPC classification are required." });

        var character = new CampaignCharacter
        {
            Id = Guid.NewGuid(), CampaignId = campaignId, Name = request.Name.Trim(), Kind = kind,
        };
        data.Characters.Add(character);
        await data.SaveChangesAsync(cancellationToken);
        return Results.Created($"/campaigns/{campaignId}/characters/{character.Id}",
            new { character.Id, character.Name, character.Kind });
    }

    private static async Task<IResult> ChangeKindAsync(
        Guid campaignId, Guid characterId, CharacterKindRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (!ParseKind(request.Kind, out var kind))
            return Results.BadRequest(new { message = "Choose PC or NPC." });
        if (!await OwnsCampaignAsync(data, campaignId, session.Profile.UserId, cancellationToken))
            return Results.NotFound();
        var character = await data.Characters.SingleOrDefaultAsync(item =>
            item.Id == characterId && item.CampaignId == campaignId, cancellationToken);
        if (character is null) return Results.NotFound();
        character.Kind = kind;
        await data.SaveChangesAsync(cancellationToken);
        return Results.Ok(new { character.Id, character.Name, character.Kind });
    }

    private static async Task<IResult> ChangeNameAsync(
        Guid campaignId, Guid characterId, CharacterNameRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (!await OwnsCampaignAsync(data, campaignId, session.Profile.UserId, cancellationToken))
            return Results.NotFound();
        var character = await data.Characters.SingleOrDefaultAsync(item =>
            item.Id == characterId && item.CampaignId == campaignId, cancellationToken);
        if (character is null) return Results.NotFound();
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { message = "A nonblank character name is required." });
        character.Name = request.Name.Trim();
        await data.SaveChangesAsync(cancellationToken);
        return Results.Ok(new { character.Id, character.Name, character.Kind });
    }

    private static async Task<IResult> RemoveCharacterAsync(
        Guid campaignId, Guid characterId, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (!await OwnsCampaignAsync(data, campaignId, session.Profile.UserId, cancellationToken))
            return Results.NotFound();
        var character = await data.Characters.SingleOrDefaultAsync(item =>
            item.Id == characterId && item.CampaignId == campaignId, cancellationToken);
        if (character is null) return Results.NotFound();
        if (await data.Participants.AnyAsync(participant => participant.CharacterId == characterId,
                cancellationToken))
            return Results.Conflict(new { message = "This character belongs to an encounter and cannot be removed." });
        data.Characters.Remove(character);
        try { await data.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException exception) when (exception.InnerException is SqliteException
            { SqliteErrorCode: 19, SqliteExtendedErrorCode: 787 })
        {
            return Results.Conflict(new { message = "This character belongs to an encounter and cannot be removed." });
        }
        return Results.NoContent();
    }

    private static Task<bool> OwnsCampaignAsync(
        CampaignDataContext data, Guid campaignId, string userId, CancellationToken cancellationToken) =>
        data.Campaigns.AsNoTracking().AnyAsync(campaign =>
            campaign.Id == campaignId && campaign.OwnerUserId == userId, cancellationToken);

    private static bool ParseKind(string? value, out CharacterKind kind)
    {
        if (string.Equals(value, "Pc", StringComparison.OrdinalIgnoreCase))
        {
            kind = CharacterKind.Pc;
            return true;
        }
        if (string.Equals(value, "Npc", StringComparison.OrdinalIgnoreCase))
        {
            kind = CharacterKind.Npc;
            return true;
        }
        kind = default;
        return false;
    }

    private sealed record CampaignNameRequest(string? Name);
    private sealed record CharacterRequest(string? Name, string? Kind);
    private sealed record CharacterNameRequest(string? Name);
    private sealed record CharacterKindRequest(string? Kind);
}
