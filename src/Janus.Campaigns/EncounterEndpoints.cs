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
        encounters.MapPost("/{encounterId:guid}/duplicate", DuplicateAsync);
        encounters.MapPatch("/{encounterId:guid}/name", ChangeNameAsync);
        encounters.MapPost("/{encounterId:guid}/participants", AddParticipantAsync);
        encounters.MapPost("/{encounterId:guid}/participants/add-all", AddAllParticipantsAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/conditions", AddConditionAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/conditions/{kind}", RemoveConditionAsync);
        encounters.MapPatch("/{encounterId:guid}/participants/{participantId:guid}/initiative", SetInitiativeAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/remove", RemoveParticipantAsync);
        encounters.MapPatch("/{encounterId:guid}/participants/{participantId:guid}/hp", SetHpAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/damage", DamageAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/heal", HealAsync);
        encounters.MapPost("/{encounterId:guid}/fight", BeginFightAsync);
        encounters.MapPost("/{encounterId:guid}/next", NextAsync);
        encounters.MapPost("/{encounterId:guid}/skip", SkipAsync);
        encounters.MapPost("/{encounterId:guid}/reorder", ReorderAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/hold", HoldAsync);
        encounters.MapPost("/{encounterId:guid}/participants/{participantId:guid}/activate", ActivateAsync);
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

    private static async Task<IResult> DuplicateAsync(
        Guid campaignId, Guid encounterId, HttpContext context, CampaignAccessService access,
        CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var source = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .AsNoTracking().SingleOrDefaultAsync(cancellationToken);
        if (source is null) return Results.NotFound();

        var characters = await data.Characters.AsNoTracking()
            .Where(item => item.CampaignId == campaignId).ToDictionaryAsync(item => item.Id, cancellationToken);
        var sourceParticipants = await data.Participants.AsNoTracking()
            .Where(item => item.EncounterId == encounterId).ToListAsync(cancellationToken);
        var duplicate = new Encounter
        {
            Id = Guid.NewGuid(), CampaignId = campaignId, Name = $"Copy of {source.Name}",
            Phase = EncounterPhase.Prepare, Round = 1,
        };
        data.Encounters.Add(duplicate);
        var orderedParticipants = sourceParticipants
            .OrderBy(item => item.CharacterId is { } characterId ? characters[characterId].Name : item.MobName ?? "",
                StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.CharacterId)
            .ThenBy(item => item.Id);
        var position = 0;
        foreach (var sourceParticipant in orderedParticipants)
        {
            data.Participants.Add(new EncounterParticipant
            {
                Id = Guid.NewGuid(), EncounterId = duplicate.Id, CharacterId = sourceParticipant.CharacterId,
                MobName = sourceParticipant.MobName, Position = position++,
            });
        }
        await data.SaveChangesAsync(cancellationToken);
        return Results.Created($"/campaigns/{campaignId}/encounters/{duplicate.Id}",
            new { duplicate.Id, duplicate.Name, duplicate.Phase, duplicate.Round, duplicate.Revision });
    }

    private static async Task<IResult> ChangeNameAsync(
        Guid campaignId, Guid encounterId, EncounterNameUpdateRequest request, HttpContext context,
        CampaignAccessService access, CampaignDataContext data, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (request.Revision != encounter.Revision) return Stale();
        if (string.IsNullOrWhiteSpace(request.Name))
            return Results.BadRequest(new { message = "Encounter name is required." });
        var name = request.Name.Trim();
        if (encounter.Name != name)
        {
            encounter.Name = name;
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
        }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
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
        if (!GameNumberInput.TryInitiative(request.Initiative, out var initiative))
            return Results.BadRequest(new { message = "Initiative must be a whole number of at most 4096 characters." });
        if (!GameNumberInput.TryHp(request.CurrentHp, out var currentHp))
            return Results.BadRequest(new { message = "HP must be a finite decimal number of at most 4096 characters." });
        var participant = new EncounterParticipant
        {
            Id = Guid.NewGuid(), EncounterId = encounterId, CharacterId = request.CharacterId,
            MobName = isMob ? request.MobName!.Trim() : null, Initiative = initiative,
            CurrentHp = currentHp, IsHeld = request.IsHeld,
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
            if (!request.IsHeld && activeIndex < 0 && existing.Any(item => !item.IsHeld)) return InvalidFight();
            if (existing.Count == int.MaxValue)
                return Results.Conflict(new { message = "This encounter has too many participants." });
            await StagePositionsAsync(data, existing, cancellationToken);
            existing.Insert(request.IsHeld ? existing.Count : Math.Max(0, activeIndex), participant);
            for (var index = 0; index < existing.Count; index++) existing[index].Position = index;
            if (!request.IsHeld && encounter.ActiveParticipantId is null)
                encounter.ActiveParticipantId = participant.Id;
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

    private static async Task<IResult> AddAllParticipantsAsync(
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
        var characters = (await data.Characters.Where(item => item.CampaignId == campaignId)
            .ToListAsync(cancellationToken))
            .OrderBy(item => item.Kind).ThenBy(item => item.Name).ThenBy(item => item.Id);
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId)
            .ToListAsync(cancellationToken);
        var existingIds = participants.Where(item => item.CharacterId.HasValue)
            .Select(item => item.CharacterId!.Value).ToHashSet();
        var missing = characters.Where(item => !existingIds.Contains(item.Id)).ToArray();
        if (missing.Length == 0) return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
        var lastPosition = participants.Count == 0 ? -1 : participants.Max(item => item.Position);
        if (missing.Length > int.MaxValue - (long)lastPosition - 1)
            return Results.Conflict(new { message = "This encounter has too many participants." });
        foreach (var character in missing)
            data.Participants.Add(new EncounterParticipant
            {
                Id = Guid.NewGuid(), EncounterId = encounterId, CharacterId = character.Id,
                Position = ++lastPosition,
            });
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

    private static async Task<IResult> AddConditionAsync(
        Guid campaignId, Guid encounterId, Guid participantId, ConditionRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Fight) return FightOnly();
        if (request.Revision != encounter.Revision) return Stale();
        if (request.Kind is null || !ConditionCatalog.Contains(request.Kind))
            return Results.BadRequest(new { message = "Choose a supported status from the Statuses box." });
        var participant = await data.Participants.SingleOrDefaultAsync(item => item.Id == participantId
            && item.EncounterId == encounterId, cancellationToken);
        if (participant is null) return Results.NotFound();
        if (!await data.Conditions.AnyAsync(item => item.ParticipantId == participantId
                && item.Kind == request.Kind, cancellationToken))
        {
            data.Conditions.Add(new ParticipantCondition
            {
                ParticipantId = participantId, Kind = request.Kind,
                AppliedAtTurnCount = participant.TurnCount,
            });
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
            catch (DbUpdateException exception) when (UniqueConstraint(exception)) { return Stale(); }
        }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> RemoveConditionAsync(
        Guid campaignId, Guid encounterId, Guid participantId, string kind, RevisionRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Fight) return FightOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participant = await data.Participants.AnyAsync(item => item.Id == participantId
            && item.EncounterId == encounterId, cancellationToken);
        if (!participant) return Results.NotFound();
        var condition = await data.Conditions.SingleOrDefaultAsync(item => item.ParticipantId == participantId
            && item.Kind == kind, cancellationToken);
        if (condition is not null)
        {
            data.Conditions.Remove(condition);
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
        }
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
        if (!GameNumberInput.TryInitiative(request.Initiative, out var initiative))
            return Results.BadRequest(new { message = "Initiative must be a whole number of at most 4096 characters." });
        if (participant.Initiative != initiative)
        {
            participant.Initiative = initiative;
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
        }
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
        var activeParticipants = participants.Where(item => !item.IsHeld).ToList();
        if (activeParticipants.Count == 0)
            return Results.BadRequest(new { message = "Add a participant before starting Fight." });
        if (activeParticipants.Any(item => item.Initiative is null))
            return Results.BadRequest(new { message = "Every participant needs initiative before Fight." });
        var ordered = EncounterStateTransitions.InitialOrder(participants);
        await StagePositionsAsync(data, participants, cancellationToken);
        EncounterStateTransitions.BeginFight(encounter, participants, ordered);
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
        await using var transaction = await data.Database.BeginTransactionAsync(cancellationToken);
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase != EncounterPhase.Fight) return FightOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId && !item.IsHeld)
            .OrderBy(item => item.Position).ToListAsync(cancellationToken);
        var active = participants.SingleOrDefault(item => item.Id == encounter.ActiveParticipantId);
        if (active is null) return InvalidFight();
        await StagePositionsAsync(data, participants, cancellationToken);
        EncounterStateTransitions.Advance(encounter, participants, active, skip);
        encounter.Revision++;
        try
        {
            await data.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
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
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId && !item.IsHeld)
            .OrderBy(item => item.Position).ToListAsync(cancellationToken);
        var oldOrder = participants.Select(item => item.Id).ToArray();
        if (request.OrderedIds is null || !EncounterFlow.IsPermutation(oldOrder, request.OrderedIds))
            return Results.BadRequest(new { message = "Order must contain every participant exactly once." });
        if (encounter.ActiveParticipantId is not { } activeId || !oldOrder.Contains(activeId))
            return InvalidFight();
        if (oldOrder.SequenceEqual(request.OrderedIds)
            && (!request.MakeActive || activeId == request.OrderedIds[0]))
            return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
        await StagePositionsAsync(data, participants, cancellationToken);
        EncounterStateTransitions.Reorder(encounter, participants, request.OrderedIds, request.MakeActive);
        encounter.Revision++;
        try
        {
            await data.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> HoldAsync(
        Guid campaignId, Guid encounterId, Guid participantId, RevisionRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        await using var transaction = await data.Database.BeginTransactionAsync(cancellationToken);
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase == EncounterPhase.Finished) return FinishedOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId)
            .OrderBy(item => item.Position).ToListAsync(cancellationToken);
        var participant = participants.SingleOrDefault(item => item.Id == participantId);
        if (participant is null) return Results.NotFound();
        if (participant.IsHeld) return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
        await StagePositionsAsync(data, participants, cancellationToken);
        EncounterStateTransitions.Hold(encounter, participants, participant);
        encounter.Revision++;
        try
        {
            await data.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException) { return Stale(); }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static async Task<IResult> ActivateAsync(
        Guid campaignId, Guid encounterId, Guid participantId, ActivateRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        await using var transaction = await data.Database.BeginTransactionAsync(cancellationToken);
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase == EncounterPhase.Finished) return FinishedOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participants = await data.Participants.Where(item => item.EncounterId == encounterId)
            .OrderBy(item => item.Position).ToListAsync(cancellationToken);
        var participant = participants.SingleOrDefault(item => item.Id == participantId);
        if (participant is null) return Results.NotFound();
        if (!participant.IsHeld) return Results.Conflict(new { message = "This participant is already active." });
        var active = participants.Where(item => !item.IsHeld).ToList();
        if (encounter.Phase == EncounterPhase.Fight && encounter.ActiveParticipantId is { } activeId)
        {
            var byId = active.ToDictionary(item => item.Id);
            active = EncounterFlow.StartingAt(active.Select(item => item.Id).ToArray(), activeId)
                .Select(id => byId[id]).ToList();
        }
        if (request.TargetIndex < 0 || request.TargetIndex > active.Count
            || (request.MakeActive && request.TargetIndex != 0)
            || (encounter.Phase == EncounterPhase.Fight && active.Count > 0 && request.TargetIndex == 0 && !request.MakeActive))
            return Results.BadRequest(new { message = "Choose a valid position in the active list." });
        await StagePositionsAsync(data, participants, cancellationToken);
        EncounterStateTransitions.Release(encounter, participants, participant, request.TargetIndex, request.MakeActive);
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
                && item.EncounterId == encounterId && !item.IsHeld, cancellationToken))
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

    private static async Task<IResult> SetHpAsync(
        Guid campaignId, Guid encounterId, Guid participantId, HpRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase == EncounterPhase.Finished) return FinishedOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participant = await data.Participants.SingleOrDefaultAsync(item =>
            item.Id == participantId && item.EncounterId == encounterId, cancellationToken);
        if (participant is null) return Results.NotFound();
        if (!GameNumberInput.TryHp(request.CurrentHp, out var currentHp))
            return Results.BadRequest(new { message = "HP must be a finite decimal number of at most 4096 characters." });
        if (participant.CurrentHp != currentHp)
        {
            participant.CurrentHp = currentHp;
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
        }
        return Results.Ok(await DetailAsync(data, encounter, cancellationToken));
    }

    private static Task<IResult> DamageAsync(
        Guid campaignId, Guid encounterId, Guid participantId, HpAmountRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken) =>
        AdjustHpAsync(campaignId, encounterId, participantId, request, context, access,
            data, heal: false, cancellationToken);

    private static Task<IResult> HealAsync(
        Guid campaignId, Guid encounterId, Guid participantId, HpAmountRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        CancellationToken cancellationToken) =>
        AdjustHpAsync(campaignId, encounterId, participantId, request, context, access,
            data, heal: true, cancellationToken);

    private static async Task<IResult> AdjustHpAsync(
        Guid campaignId, Guid encounterId, Guid participantId, HpAmountRequest request,
        HttpContext context, CampaignAccessService access, CampaignDataContext data,
        bool heal, CancellationToken cancellationToken)
    {
        var session = await access.CheckAsync(context, cancellationToken);
        if (session.Profile is null) return session.Failure();
        var encounter = await OwnedEncounter(data, campaignId, encounterId, session.Profile.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (encounter is null) return Results.NotFound();
        if (encounter.Phase == EncounterPhase.Finished) return FinishedOnly();
        if (request.Revision != encounter.Revision) return Stale();
        var participant = await data.Participants.SingleOrDefaultAsync(item =>
            item.Id == participantId && item.EncounterId == encounterId, cancellationToken);
        if (participant is null) return Results.NotFound();
        if (participant.CurrentHp is null)
            return Results.Conflict(new { message = "Set current HP before using Damage or Heal." });
        if (!ExactDecimal.TryParse(request.Amount, out var amount))
            return Results.BadRequest(new { message = "Enter a finite decimal amount of at most 4096 characters." });
        if (!ExactDecimal.TryParse(participant.CurrentHp, out var previous)) return InvalidHp();
        if (!GameNumberInput.TryAdjustHp(previous, amount, heal, out var canonical))
            return Results.BadRequest(new { message = "The resulting HP needs too many digits to process." });
        if (participant.CurrentHp != canonical)
        {
            participant.CurrentHp = canonical;
            encounter.Revision++;
            try { await data.SaveChangesAsync(cancellationToken); }
            catch (DbUpdateConcurrencyException) { return Stale(); }
        }
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
        var participantIds = participants.Select(item => item.Id).ToArray();
        var conditions = await data.Conditions.AsNoTracking()
            .Where(item => participantIds.Contains(item.ParticipantId)).ToListAsync(cancellationToken);
        var savedOrder = participants.Where(item => !item.IsHeld).OrderBy(item => item.Position).ToArray();
        var heldOrder = participants.Where(item => item.IsHeld).OrderBy(item => item.Position).ToArray();
        var ordered = encounter.Phase == EncounterPhase.Fight && encounter.ActiveParticipantId is { } activeId
            ? EncounterFlow.StartingAt(savedOrder.Select(item => item.Id).ToArray(), activeId)
                .Select(id => savedOrder.Single(item => item.Id == id))
            : savedOrder.AsEnumerable();
        return new
        {
            encounter.Id, encounter.CampaignId, encounter.Name, encounter.Phase,
            encounter.Round, encounter.ActiveParticipantId, encounter.Revision,
            Participants = ordered.Concat(heldOrder).Select(item => new
            {
                item.Id, item.CharacterId,
                Name = item.CharacterId is { } characterId ? characters[characterId].Name : item.MobName!,
                Kind = item.CharacterId is { } id ? characters[id].Kind.ToString() : "Mob",
                item.Initiative, item.CurrentHp,
                Status = item.CurrentHp is { } hp && ExactDecimal.TryParse(hp, out var value)
                    ? value.Status : null,
                item.Position, item.IsHeld, item.TurnCount,
                Conditions = conditions.Where(condition => condition.ParticipantId == item.Id)
                    .OrderBy(condition => condition.Kind)
                    .Select(condition => new { condition.Kind,
                        TurnCount = item.TurnCount - condition.AppliedAtTurnCount }).ToArray(),
            }).ToArray(),
        };
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

    private static IResult InvalidHp() => Results.Conflict(new
    {
        message = "Saved HP could not be read. Reload this encounter.",
    });

    private sealed record EncounterNameRequest(string? Name);
    private sealed record EncounterNameUpdateRequest(long Revision, string? Name);
    private sealed record AddParticipantRequest(long Revision, Guid? CharacterId, string? MobName,
        string? Initiative, string? CurrentHp, bool IsHeld = false);
    private sealed record InitiativeRequest(long Revision, string? Initiative);
    private sealed record RevisionRequest(long Revision);
    private sealed record ReorderRequest(long Revision, Guid[]? OrderedIds, bool MakeActive = false);
    private sealed record ActivateRequest(long Revision, int TargetIndex, bool MakeActive = false);
    private sealed record SetActiveRequest(long Revision, Guid ParticipantId);
    private sealed record HpRequest(long Revision, string? CurrentHp);
    private sealed record HpAmountRequest(long Revision, string? Amount);
    private sealed record ConditionRequest(long Revision, string? Kind);
}
