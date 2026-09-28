using System.Globalization;
using System.Numerics;
using Janus.Campaigns.Persistence;
using Janus.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Janus.Campaigns;

internal static class EncounterEndpoints
{
    public static void MapEncounterEndpoints(this WebApplication app)
    {
        var encounters = app.MapGroup("/campaigns/{campaignId:guid}/encounters");
        encounters.MapGet("/", ListAsync);
        encounters.MapPost("/", CreateAsync);
        encounters.MapGet("/{encounterId:guid}", GetAsync);
        encounters.MapPost("/{encounterId:guid}/participants", AddParticipantAsync);
        encounters.MapPatch("/{encounterId:guid}/participants/{participantId:guid}/initiative", SetInitiativeAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/move-tie", MoveTieAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/remove", RemoveParticipantAsync);
        encounters.MapPost("/{encounterId:guid}/fight", BeginFightAsync);
        encounters.MapPost("/{encounterId:guid}/next", NextAsync);
        encounters.MapPost("/{encounterId:guid}/skip", SkipAsync);
        encounters.MapPost("/{encounterId:guid}/reorder", ReorderAsync);
        encounters.MapPost("/{encounterId:guid}/active", SetActiveAsync);
        encounters.MapPost("/{encounterId:guid}/end", EndAsync);
    }

    private static async Task<IResult> ListAsync(
        Guid campaignId, HttpContext context, CampaignAccessService access,
        CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (!await OwnsCampaignAsync(data, campaignId, session.Profile.UserId, cancellationToken))
            return Results.NotFound();
        var items = await data.Encounters.AsNoTracking().Where(item => item.CampaignId == campaignId)
            .OrderBy(item => item.Name).ThenBy(item => item.Id)
            .Select(item => new { item.Id, item.Name, item.Phase, item.Round, item.Revision })
            .ToListAsync(cancellationToken);
        return Results.Ok(items);
    }

    private static async Task<IResult> CreateAsync(
        Guid campaignId, EncounterNameRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (!await OwnsCampaignAsync(data, campaignId, session.Profile.UserId, cancellationToken))
            return Results.NotFound();
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { message = "Encounter name is required." });
        var encounter = new Encounter
        {
            Id = Guid.NewGuid(), CampaignId = campaignId, Name = request.Name.Trim(),
            Phase = EncounterPhase.Prepare, Round = 1,
        };
        data.Encounters.Add(encounter);
        await data.SaveChangesAsync(cancellationToken);
        return Results.Created($"/campaigns/{campaignId}/encounters/{encounter.Id}",
            new { encounter.Id, encounter.Name, encounter.Phase, encounter.Round, encounter.Revision });
    }

    private static async Task<IResult> GetAsync(
        Guid campaignId, Guid encounterId, HttpContext context, CampaignAccessService access,
        CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        return encounter is null ? Results.NotFound()
            : Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> AddParticipantAsync(
        Guid campaignId, Guid encounterId, AddParticipantRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        await using var transaction = await data.Database.BeginTransactionAsync(cancellationToken);
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase == EncounterPhase.Finished) return FinishedOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var isMob = !string.IsNullOrWhiteSpace(request.MobName);
        if (isMob == request.CharacterId.HasValue)
            return Results.BadRequest(new { message = "Choose one campaign character or enter one mob name." });
        if (request.CharacterId.HasValue)
        {
            if (!await data.Characters.AnyAsync(item => item.Id == request.CharacterId
                    && item.CampaignId == campaignId, cancellationToken))
                return Results.NotFound();
            if (await data.Participants.AnyAsync(item => item.EncounterId == encounterId
                    && item.CharacterId == request.CharacterId, cancellationToken))
                return Results.Conflict(new { message = "This character is already in the encounter." });
        }
        if (!TryInitiative(request.Initiative, out var initiative))
            return Results.BadRequest(new { message = "Initiative must be a whole number." });
        var participant = new EncounterParticipant
        {
            Id = Guid.NewGuid(), EncounterId = encounterId, CharacterId = request.CharacterId,
            MobName = isMob ? request.MobName!.Trim() : null, Initiative = initiative,
        };
        if (encounter.Phase == EncounterPhase.Prepare)
        {
            var lastPosition = await data.Participants.Where(item => item.EncounterId == encounterId)
                .Select(item => (int?)item.Position).MaxAsync(cancellationToken) ?? -1;
            if (lastPosition == int.MaxValue)
                return Results.Conflict(new { message = "This encounter has too many participants." });
            participant.Position = lastPosition + 1;
        }
        else
        {
            var existing = await data.Participants.Where(item => item.EncounterId == encounterId)
                .OrderBy(item => item.Position).ToListAsync(cancellationToken);
            var activeIndex = existing.FindIndex(item => item.Id == encounter.ActiveParticipantId);
            if (activeIndex < 0) return InvalidFight();
            if (existing.Count == int.MaxValue)
                return Results.Conflict(new { message = "This encounter has too many participants." });
            await StagePositionsAsync(data, existing, cancellationToken);
            existing.Insert(activeIndex, participant);
            for (var index = 0; index < existing.Count; index++) existing[index].Position = index;
        }
        data.Participants.Add(participant);
        encounter.Revision++;
        try
        {
            await data.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        catch (DbUpdateException exception) when (UniqueConstraint(exception)) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> SetInitiativeAsync(
        Guid campaignId, Guid encounterId, Guid participantId, InitiativeRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Prepare) return PrepareOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participant = await data.Participants.SingleOrDefaultAsync(item =>
            item.Id == participantId && item.EncounterId == encounterId, cancellationToken);
        if (participant is null) return Results.NotFound();
        if (!TryInitiative(request.Initiative, out var initiative))
            return Results.BadRequest(new { message = "Initiative must be a whole number." });
        if (participant.Initiative != initiative)
        {
            participant.Initiative = initiative;
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
        }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> MoveTieAsync(
        Guid campaignId, Guid encounterId, Guid participantId, MoveTieRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        if (request.Direction is not ("up" or "down"))
            return Results.BadRequest(new { message = "Choose up or down." });
        await using var transaction = await data.Database.BeginTransactionAsync(cancellationToken);
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Prepare) return PrepareOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var all = await data.Participants.Where(item => item.EncounterId == encounterId)
            .ToListAsync(cancellationToken);
        var ordered = OrderForPrepare(all).ToList();
        var index = ordered.FindIndex(item => item.Id == participantId);
        if (index < 0) return Results.NotFound();
        var otherIndex = index + (request.Direction == "up" ? -1 : 1);
        if (otherIndex < 0 || otherIndex >= ordered.Count
            || ordered[index].Initiative is null
            || ordered[index].Initiative != ordered[otherIndex].Initiative)
            return Results.BadRequest(new { message = "A tied participant is required in that direction." });
        var first = ordered[index];
        var second = ordered[otherIndex];
        var originalPosition = first.Position;
        var secondPosition = second.Position;
        first.Position = -1;
        await data.SaveChangesAsync(cancellationToken);
        second.Position = originalPosition;
        await data.SaveChangesAsync(cancellationToken);
        first.Position = secondPosition;
        encounter.Revision++;
        try
        {
            await data.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> RemoveParticipantAsync(
        Guid campaignId, Guid encounterId, Guid participantId, RevisionRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Prepare) return PrepareOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participant = await data.Participants.SingleOrDefaultAsync(item =>
            item.Id == participantId && item.EncounterId == encounterId, cancellationToken);
        if (participant is null) return Results.NotFound();
        data.Participants.Remove(participant);
        encounter.Revision++;
        try { await data.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> BeginFightAsync(
        Guid campaignId, Guid encounterId, RevisionRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        await using var transaction = await data.Database.BeginTransactionAsync(cancellationToken);
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Prepare) return PrepareOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId)
            .ToListAsync(cancellationToken);
        if (participants.Count == 0)
            return Results.BadRequest(new { message = "Add a participant before starting Fight." });
        if (participants.Any(item => item.Initiative is null))
            return Results.BadRequest(new { message = "Every participant needs initiative before Fight." });
        var ordered = OrderForPrepare(participants).ToList();
        await StagePositionsAsync(data, participants, cancellationToken);
        for (var index = 0; index < ordered.Count; index++) ordered[index].Position = index;
        encounter.Phase = EncounterPhase.Fight;
        encounter.ActiveParticipantId = ordered[0].Id;
        encounter.Round = 1;
        encounter.Revision++;
        try
        {
            await data.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static Task<IResult> NextAsync(
        Guid campaignId, Guid encounterId, RevisionRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken) =>
        AdvanceAsync(campaignId, encounterId, request, context, access, data, skip: false, cancellationToken);

    private static Task<IResult> SkipAsync(
        Guid campaignId, Guid encounterId, RevisionRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken) =>
        AdvanceAsync(campaignId, encounterId, request, context, access, data, skip: true, cancellationToken);

    private static async Task<IResult> AdvanceAsync(
        Guid campaignId, Guid encounterId, RevisionRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, bool skip,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Fight) return FightOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId)
            .OrderBy(item => item.Position).ToListAsync(cancellationToken);
        var active = participants.SingleOrDefault(item => item.Id == encounter.ActiveParticipantId);
        if (active is null) return InvalidFight();
        var advance = EncounterFlow.Advance(participants.Select(item => item.Id).ToArray(), active.Id, skip);
        encounter.ActiveParticipantId = advance.NextParticipantId;
        if (advance.IncrementTurn) active.TurnCount++;
        if (advance.IncrementRound) encounter.Round++;
        encounter.Revision++;
        try { await data.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> ReorderAsync(
        Guid campaignId, Guid encounterId, ReorderRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        await using var transaction = await data.Database.BeginTransactionAsync(cancellationToken);
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Fight) return FightOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId)
            .OrderBy(item => item.Position).ToListAsync(cancellationToken);
        var oldOrder = participants.Select(item => item.Id).ToArray();
        if (request.OrderedIds is null || !EncounterFlow.IsPermutation(oldOrder, request.OrderedIds))
            return Results.BadRequest(new { message = "Order must contain every participant exactly once." });
        if (encounter.ActiveParticipantId is not { } activeId || !oldOrder.Contains(activeId))
            return InvalidFight();
        if (oldOrder.SequenceEqual(request.OrderedIds))
            return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
        var successor = EncounterFlow.ActiveAfterReorder(oldOrder, activeId);
        await StagePositionsAsync(data, participants, cancellationToken);
        var byId = participants.ToDictionary(item => item.Id);
        for (var index = 0; index < request.OrderedIds.Length; index++)
            byId[request.OrderedIds[index]].Position = index;
        encounter.ActiveParticipantId = successor;
        encounter.Revision++;
        try
        {
            await data.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> SetActiveAsync(
        Guid campaignId, Guid encounterId, SetActiveRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Fight) return FightOnly();
        if (request.Revision != encounter.Revision) return Stale();
        if (!await data.Participants.AnyAsync(item => item.Id == request.ParticipantId
                && item.EncounterId == encounterId, cancellationToken))
            return Results.NotFound();
        if (encounter.ActiveParticipantId != request.ParticipantId)
        {
            encounter.ActiveParticipantId = request.ParticipantId;
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
        }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> EndAsync(
        Guid campaignId, Guid encounterId, RevisionRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Fight) return FightOnly();
        if (request.Revision != encounter.Revision) return Stale();
        encounter.Phase = EncounterPhase.Finished;
        encounter.ActiveParticipantId = null;
        encounter.Revision++;
        try { await data.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task StagePositionsAsync(
        CampaignDataContext data, IEnumerable<EncounterParticipant> participants,
        CancellationToken cancellationToken)
    {
        foreach (var participant in participants) participant.Position = -participant.Position - 1;
        await data.SaveChangesAsync(cancellationToken);
    }

    private static async Task<object> DetailAsync(
        CampaignDataContext data, Encounter encounter, CancellationToken cancellationToken)
    {
        var participants = await data.Participants.AsNoTracking()
            .Where(item => item.EncounterId == encounter.Id).ToListAsync(cancellationToken);
        var characters = await data.Characters.AsNoTracking()
            .Where(item => item.CampaignId == encounter.CampaignId).ToDictionaryAsync(item => item.Id, cancellationToken);
        var ordered = encounter.Phase == EncounterPhase.Prepare
            ? OrderForPrepare(participants) : participants.OrderBy(item => item.Position);
        return new
        {
            encounter.Id, encounter.CampaignId, encounter.Name, encounter.Phase,
            encounter.Round, encounter.ActiveParticipantId, encounter.Revision,
            Participants = ordered.Select(item => new
            {
                item.Id, item.CharacterId,
                Name = item.CharacterId is { } characterId ? characters[characterId].Name : item.MobName!,
                Kind = item.CharacterId is { } id ? characters[id].Kind.ToString() : "Mob",
                item.Initiative, item.CurrentHp, item.Position, item.TurnCount,
            }).ToArray(),
        };
    }

    private static IEnumerable<EncounterParticipant> OrderForPrepare(IEnumerable<EncounterParticipant> items) =>
        items.OrderBy(item => item.Initiative is null)
            .ThenByDescending(item => item.Initiative is null ? BigInteger.Zero
                : BigInteger.Parse(item.Initiative, CultureInfo.InvariantCulture))
            .ThenBy(item => item.Position);

    private static bool TryInitiative(string? input, out string? canonical)
    {
        canonical = null;
        if (input is null || input.Trim().Length == 0) return true;
        var trimmed = input.Trim();
        if (trimmed.AsSpan().IndexOfAnyExceptInRange('0', '9') >= 0
            && !(trimmed.Length > 1 && (trimmed[0] == '+' || trimmed[0] == '-')
                && trimmed.AsSpan(1).IndexOfAnyExceptInRange('0', '9') < 0)) return false;
        if (!BigInteger.TryParse(trimmed, NumberStyles.AllowLeadingSign,
                CultureInfo.InvariantCulture, out var value)) return false;
        canonical = value.ToString(CultureInfo.InvariantCulture);
        return true;
    }

    private static IQueryable<Encounter> OwnedEncounter(
        CampaignDataContext data, Guid campaignId, Guid encounterId, string userId) =>
        data.Encounters.Where(item => item.Id == encounterId && item.CampaignId == campaignId
            && data.Campaigns.Any(campaign => campaign.Id == campaignId
                && campaign.OwnerUserId == userId));

    private static Task<bool> OwnsCampaignAsync(
        CampaignDataContext data, Guid campaignId, string userId, CancellationToken cancellationToken) =>
        data.Campaigns.AsNoTracking().AnyAsync(campaign => campaign.Id == campaignId
            && campaign.OwnerUserId == userId, cancellationToken);

    private static bool UniqueConstraint(DbUpdateException exception) =>
        exception.InnerException is SqliteException { SqliteErrorCode: 19 };

    private static IResult Stale() => Results.Conflict(new
    {
        message = "This encounter changed in another session. Reload it before trying again.",
    });

    private static IResult PrepareOnly() => Results.Conflict(new
    {
        message = "This action is available only during Prepare.",
    });

    private static IResult FightOnly() => Results.Conflict(new
    {
        message = "This action is available only during Fight.",
    });

    private static IResult FinishedOnly() => Results.Conflict(new
    {
        message = "Finished encounters cannot be changed through this workflow.",
    });

    private static IResult InvalidFight() => Results.Conflict(new
    {
        message = "The active participant could not be found. Reload this encounter.",
    });

    private sealed record EncounterNameRequest(string? Name);
    private sealed record AddParticipantRequest(long Revision, Guid? CharacterId, string? MobName,
        string? Initiative);
    private sealed record InitiativeRequest(long Revision, string? Initiative);
    private sealed record MoveTieRequest(long Revision, string? Direction);
    private sealed record RevisionRequest(long Revision);
    private sealed record ReorderRequest(long Revision, Guid[]? OrderedIds);
    private sealed record SetActiveRequest(long Revision, Guid ParticipantId);
}
