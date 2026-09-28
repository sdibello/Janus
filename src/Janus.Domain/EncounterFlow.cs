namespace Janus.Domain;

public static class EncounterFlow
{
    public static TurnAdvance Advance(IReadOnlyList<Guid> order, Guid activeId, bool skip)
    {
        var index = IndexOf(order, activeId);
        var nextIndex = (index + 1) % order.Count;
        return new TurnAdvance(order[nextIndex], !skip, !skip && nextIndex == 0);
    }

    public static Guid ActiveAfterReorder(IReadOnlyList<Guid> previousOrder, Guid activeId) =>
        previousOrder[(IndexOf(previousOrder, activeId) + 1) % previousOrder.Count];

    public static bool IsPermutation(IReadOnlyList<Guid> existing, IReadOnlyList<Guid> proposed) =>
        existing.Count == proposed.Count && proposed.Distinct().Count() == proposed.Count
        && existing.ToHashSet().SetEquals(proposed);

    private static int IndexOf(IReadOnlyList<Guid> order, Guid id)
    {
        for (var index = 0; index < order.Count; index++)
            if (order[index] == id) return index;
        throw new ArgumentException("The active participant must belong to the encounter.", nameof(id));
    }
}

public sealed record TurnAdvance(Guid NextParticipantId, bool IncrementTurn, bool IncrementRound);
