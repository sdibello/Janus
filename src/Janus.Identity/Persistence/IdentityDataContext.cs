using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Janus.Identity.Persistence;

public sealed class JanusUser : IdentityUser
{
    public string? PendingProductId { get; set; }
}

public sealed class IdentityDataContext(DbContextOptions<IdentityDataContext> options)
    : IdentityDbContext<JanusUser, IdentityRole, string>(options)
{
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductGrant> ProductGrants => Set<ProductGrant>();
    public DbSet<ProductAdministrator> ProductAdministrators => Set<ProductAdministrator>();
    public DbSet<ProductAccessRequest> ProductAccessRequests => Set<ProductAccessRequest>();
    public DbSet<RegistrationInvitation> RegistrationInvitations => Set<RegistrationInvitation>();
    public DbSet<LocalMailMessage> LocalMailMessages => Set<LocalMailMessage>();
    public DbSet<PasswordResetProof> PasswordResetProofs => Set<PasswordResetProof>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<JanusUser>().HasIndex(user => user.NormalizedEmail).IsUnique();
        builder.Entity<Product>().HasKey(product => product.Id);
        builder.Entity<Product>().HasData(new Product { Id = "janus-campaigns", Name = "Janus campaigns" });
        builder.Entity<ProductGrant>().HasKey(grant => new { grant.UserId, grant.ProductId });
        builder.Entity<ProductGrant>().HasOne<JanusUser>().WithMany().HasForeignKey(grant => grant.UserId);
        builder.Entity<ProductGrant>().HasOne<Product>().WithMany().HasForeignKey(grant => grant.ProductId);
        builder.Entity<ProductAdministrator>().HasKey(administrator => new { administrator.UserId, administrator.ProductId });
        builder.Entity<ProductAdministrator>().HasOne<JanusUser>().WithMany().HasForeignKey(administrator => administrator.UserId);
        builder.Entity<ProductAdministrator>().HasOne<Product>().WithMany().HasForeignKey(administrator => administrator.ProductId);
        builder.Entity<ProductAccessRequest>().HasKey(request => request.Id);
        builder.Entity<ProductAccessRequest>().HasOne<JanusUser>().WithMany().HasForeignKey(request => request.UserId);
        builder.Entity<ProductAccessRequest>().HasOne<Product>().WithMany().HasForeignKey(request => request.ProductId);
        builder.Entity<ProductAccessRequest>().HasIndex(request => new { request.UserId, request.ProductId })
            .IsUnique().HasFilter("Status = 'Pending'");
        builder.Entity<RegistrationInvitation>().HasIndex(invitation => invitation.TokenHash).IsUnique();
        builder.Entity<RegistrationInvitation>().HasOne<Product>().WithMany().HasForeignKey(invitation => invitation.ProductId);
        builder.Entity<LocalMailMessage>().HasIndex(message => message.CreatedAtUtc);
        builder.Entity<PasswordResetProof>().HasIndex(proof => proof.TokenHash).IsUnique();
        builder.Entity<PasswordResetProof>().HasOne<JanusUser>().WithMany().HasForeignKey(proof => proof.UserId);
    }
}

public sealed class Product
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
}

public sealed class ProductGrant
{
    public string UserId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public DateTime GrantedAtUtc { get; set; }
}

public sealed class ProductAdministrator
{
    public string UserId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public DateTime AppointedAtUtc { get; set; }
}

public sealed class ProductAccessRequest
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ResolvedAtUtc { get; set; }
    public string? ResolvedByUserId { get; set; }
}

public sealed class RegistrationInvitation
{
    public Guid Id { get; set; }
    public string TokenHash { get; set; } = "";
    public string ProductId { get; set; } = "";
    public string IssuedByUserId { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
}

public sealed class LocalMailMessage
{
    public Guid Id { get; set; }
    public string Recipient { get; set; } = "";
    public string Subject { get; set; } = "";
    public string ActionUrl { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
}

public sealed class PasswordResetProof
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
}
