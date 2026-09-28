using Janus.Domain;
using Microsoft.EntityFrameworkCore;

namespace Janus.Campaigns.Persistence;

public sealed class CampaignDataContext(DbContextOptions<CampaignDataContext> options) : DbContext(options)
{
    public DbSet<Campaign> Campaigns => Set<Campaign>();
    public DbSet<CampaignCharacter> Characters => Set<CampaignCharacter>();
    public DbSet<Encounter> Encounters => Set<Encounter>();
    public DbSet<EncounterParticipant> Participants => Set<EncounterParticipant>();
    public DbSet<CampaignSession> Sessions => Set<CampaignSession>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Campaign>(entity =>
        {
            entity.ToTable("Campaigns");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.OwnerUserId).IsRequired();
            entity.Property(x => x.Name).IsRequired();
            entity.HasIndex(x => x.OwnerUserId);
        });

        modelBuilder.Entity<CampaignCharacter>(entity =>
        {
            entity.ToTable("CampaignCharacters");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).IsRequired();
            entity.Property(x => x.Kind).HasConversion<string>().IsRequired();
            entity.HasOne<Campaign>().WithMany().HasForeignKey(x => x.CampaignId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.CampaignId);
        });

        modelBuilder.Entity<Encounter>(entity =>
        {
            entity.ToTable("Encounters");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).IsRequired();
            entity.Property(x => x.Phase).HasConversion<string>().IsRequired();
            entity.Property(x => x.Revision).IsConcurrencyToken();
            entity.HasOne<Campaign>().WithMany().HasForeignKey(x => x.CampaignId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.CampaignId);
        });

        modelBuilder.Entity<EncounterParticipant>(entity =>
        {
            entity.ToTable("EncounterParticipants");
            entity.HasKey(x => x.Id);
            entity.HasOne<Encounter>().WithMany().HasForeignKey(x => x.EncounterId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<CampaignCharacter>().WithMany().HasForeignKey(x => x.CharacterId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.EncounterId, x.CharacterId }).IsUnique()
                .HasFilter("\"CharacterId\" IS NOT NULL");
            entity.HasIndex(x => new { x.EncounterId, x.Position }).IsUnique();
        });

        modelBuilder.Entity<CampaignSession>(entity =>
        {
            entity.ToTable("CampaignSessions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.ProtectedTicket).IsRequired();
            entity.HasIndex(x => x.ExpiresAtUtc);
        });
    }
}

public sealed class Campaign
{
    public Guid Id { get; set; }
    public string OwnerUserId { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTimeOffset CreatedAtUtc { get; set; }
}

public sealed class CampaignCharacter
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = "";
    public CharacterKind Kind { get; set; }
}

public sealed class Encounter
{
    public Guid Id { get; set; }
    public Guid CampaignId { get; set; }
    public string Name { get; set; } = "";
    public EncounterPhase Phase { get; set; } = EncounterPhase.Prepare;
    public int Round { get; set; } = 1;
    public Guid? ActiveParticipantId { get; set; }
    public long Revision { get; set; }
}

public sealed class EncounterParticipant
{
    public Guid Id { get; set; }
    public Guid EncounterId { get; set; }
    public Guid? CharacterId { get; set; }
    public string? MobName { get; set; }
    public string? Initiative { get; set; }
    public string? CurrentHp { get; set; }
    public int Position { get; set; }
    public long TurnCount { get; set; }
}

public sealed class CampaignSession
{
    public string Id { get; set; } = "";
    public byte[] ProtectedTicket { get; set; } = [];
    public DateTimeOffset ExpiresAtUtc { get; set; }
}
