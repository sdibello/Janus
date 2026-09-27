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
    public DbSet<RegistrationInvitation> RegistrationInvitations => Set<RegistrationInvitation>();
    public DbSet<LocalMailMessage> LocalMailMessages => Set<LocalMailMessage>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<JanusUser>().HasIndex(user => user.NormalizedEmail).IsUnique();
        builder.Entity<Product>().HasKey(product => product.Id);
        builder.Entity<Product>().HasData(new Product { Id = "janus-campaigns", Name = "Janus campaigns" });
        builder.Entity<ProductGrant>().HasKey(grant => new { grant.UserId, grant.ProductId });
        builder.Entity<ProductGrant>().HasOne<JanusUser>().WithMany().HasForeignKey(grant => grant.UserId);
        builder.Entity<ProductGrant>().HasOne<Product>().WithMany().HasForeignKey(grant => grant.ProductId);
        builder.Entity<RegistrationInvitation>().HasIndex(invitation => invitation.TokenHash).IsUnique();
        builder.Entity<RegistrationInvitation>().HasOne<Product>().WithMany().HasForeignKey(invitation => invitation.ProductId);
        builder.Entity<LocalMailMessage>().HasIndex(message => message.CreatedAtUtc);
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
