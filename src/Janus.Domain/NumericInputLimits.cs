namespace Janus.Domain;

// Limits the work needed to parse, compare, and adjust exact game values.
// It is a representation limit, not a fixed-width numeric type or rounding rule.
public static class NumericInputLimits
{
    public const int MaxCharacters = 4096;
}
