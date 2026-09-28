namespace Janus.Domain;

public static class EncounterFlow
{
    public static Guid[] StartingAt(IReadOnlyList<Guid> order, Guid activeId)
    {
        var index = IndexOf(order, activeId);
        return order.Skip(index).Concat(order.Take(index)).ToArray();
    }

    public static TurnAdvance Advance(IReadOnlyList<Guid> order, Guid activeId)
    {
        var index = IndexOf(order, activeId);
        var rotated = order.Skip(index + 1).Concat(order.Take(index + 1)).ToArray();
        return new TurnAdvance(rotated[0], rotated);
    }

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

public sealed record TurnAdvance(Guid NextParticipantId, Guid[] OrderedIds);
