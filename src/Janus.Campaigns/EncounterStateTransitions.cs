using System.Globalization;
using System.Numerics;
using Janus.Campaigns.Persistence;
using Janus.Domain;

namespace Janus.Campaigns;

// Applies encounter rules to tracked entities. Endpoints own authorization and persistence;
// these transitions contain the ordering and counter changes as one in-memory operation.
internal static class EncounterStateTransitions
{
    public static IReadOnlyList<EncounterParticipant> InitialOrder(
        IReadOnlyList<EncounterParticipant> participants) =>
        participants.Where(item => !item.IsHeld)
            .OrderBy(item => item.Initiative is null)
            .ThenByDescending(item => item.Initiative is null ? BigInteger.Zero
                : BigInteger.Parse(item.Initiative, CultureInfo.InvariantCulture))
            .ThenBy(item => item.Position)
            .Concat(participants.Where(item => item.IsHeld).OrderBy(item => item.Position))
            .ToArray();

    public static void BeginFight(Encounter encounter, IReadOnlyList<EncounterParticipant> participants,
        IReadOnlyList<EncounterParticipant> ordered)
    {
        SetPositions(ordered);
        foreach (var participant in participants) participant.CompletedThisRound = false;
        encounter.Phase = EncounterPhase.Fight;
        encounter.ActiveParticipantId = ordered[0].Id;
        encounter.Round = 1;
    }

    public static void Advance(Encounter encounter, IReadOnlyList<EncounterParticipant> participants,
        EncounterParticipant active, bool skip)
    {
        var advance = EncounterFlow.Advance(participants.Select(item => item.Id).ToArray(), active.Id);
        var byId = participants.ToDictionary(item => item.Id);
        SetPositions(advance.OrderedIds.Select(id => byId[id]).ToArray());
        encounter.ActiveParticipantId = advance.NextParticipantId;
        if (!skip) active.TurnCount++;
        active.CompletedThisRound = true;
        if (participants.All(item => item.CompletedThisRound))
        {
            encounter.Round++;
            foreach (var participant in participants) participant.CompletedThisRound = false;
        }
    }

    public static void Reorder(IReadOnlyList<EncounterParticipant> participants, IReadOnlyList<Guid> orderedIds)
    {
        var byId = participants.ToDictionary(item => item.Id);
        SetPositions(orderedIds.Select(id => byId[id]).ToArray());
    }

    public static void Hold(Encounter encounter, IReadOnlyList<EncounterParticipant> participants,
        EncounterParticipant participant)
    {
        var active = participants.Where(item => !item.IsHeld && item.Id != participant.Id).ToArray();
        var held = participants.Where(item => item.IsHeld).Append(participant).ToArray();
        var successorId = participants.SkipWhile(item => item.Id != participant.Id)
            .Skip(1).FirstOrDefault(item => !item.IsHeld)?.Id
            ?? active.FirstOrDefault()?.Id;
        participant.IsHeld = true;
        participant.CompletedThisRound = false;
        SetPositions(active.Concat(held).ToArray());
        if (encounter.ActiveParticipantId == participant.Id)
            encounter.ActiveParticipantId = successorId;
    }

    public static void Release(Encounter encounter, IReadOnlyList<EncounterParticipant> participants,
        EncounterParticipant participant, int targetIndex)
    {
        var active = participants.Where(item => !item.IsHeld).ToList();
        if (encounter.Phase == EncounterPhase.Fight && encounter.ActiveParticipantId is { } activeId)
        {
            var byId = active.ToDictionary(item => item.Id);
            active = EncounterFlow.StartingAt(active.Select(item => item.Id).ToArray(), activeId)
                .Select(id => byId[id]).ToList();
        }
        var held = participants.Where(item => item.IsHeld && item.Id != participant.Id).ToArray();
        participant.IsHeld = false;
        participant.CompletedThisRound = false;
        active.Insert(targetIndex, participant);
        SetPositions(active.Concat(held).ToArray());
        if (encounter.Phase == EncounterPhase.Fight && encounter.ActiveParticipantId is null)
            encounter.ActiveParticipantId = participant.Id;
    }

    private static void SetPositions(IReadOnlyList<EncounterParticipant> ordered)
    {
        for (var index = 0; index < ordered.Count; index++) ordered[index].Position = index;
    }
}
