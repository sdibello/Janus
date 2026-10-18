using Janus.Campaigns;
using Janus.Campaigns.Persistence;
using Janus.Domain;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

static void Check(bool condition, string message)
{
    if (!condition) throw new Exception(message);
}

var first = new EncounterParticipant { Id = Guid.NewGuid(), Position = 0, Initiative = "12" };
var second = new EncounterParticipant { Id = Guid.NewGuid(), Position = 1, Initiative = "12" };
var third = new EncounterParticipant { Id = Guid.NewGuid(), Position = 2, Initiative = "15" };
var held = new EncounterParticipant { Id = Guid.NewGuid(), Position = 3, IsHeld = true };
var participants = new List<EncounterParticipant> { first, second, third, held };
var encounter = new Encounter { Phase = EncounterPhase.Prepare, Round = 1 };

var initial = EncounterStateTransitions.InitialOrder(participants);
Check(initial.Select(item => item.Id).SequenceEqual([third.Id, first.Id, second.Id, held.Id]),
    "Initiative ties or Hold changed the initial order.");
EncounterStateTransitions.BeginFight(encounter, participants, initial);
Check(encounter.Phase == EncounterPhase.Fight && encounter.ActiveParticipantId == third.Id
    && third.Position == 0 && first.Position == 1 && second.Position == 2,
    "Fight did not start with the expected active participant and saved order.");

EncounterStateTransitions.Advance(encounter, [third, first, second], third, skip: false);
Check(encounter.ActiveParticipantId == first.Id && third.TurnCount == 1 && encounter.Round == 1,
    "Next did not advance the active participant or individual turn.");
EncounterStateTransitions.Advance(encounter, [first, second, third], first, skip: true);
Check(first.TurnCount == 0 && encounter.Round == 1, "Skip changed the individual turn or Round.");
EncounterStateTransitions.Advance(encounter, [second, third, first], second, skip: false);
Check(encounter.Round == 2 && participants.All(item => !item.CompletedThisRound),
    "Round completion did not reset progress after all active participants acted.");

// Position staging uses negative temporary positions to avoid the SQLite unique index.
// The transition must use the supplied order, not those temporary values.
var ordered = participants.OrderBy(item => item.Position).ToList();
foreach (var item in ordered) item.Position = -item.Position - 1;
encounter.ActiveParticipantId = third.Id;
EncounterStateTransitions.Hold(encounter, ordered, third);
Check(encounter.ActiveParticipantId == first.Id && third.IsHeld && third.Position == 3,
    "Holding the active participant selected the wrong successor.");

ordered = participants.OrderBy(item => item.Position).ToList();
foreach (var item in ordered) item.Position = -item.Position - 1;
EncounterStateTransitions.Release(encounter, ordered, held, targetIndex: 1);
Check(!held.IsHeld && held.Position == 1 && encounter.ActiveParticipantId == first.Id,
    "Release changed the active participant or insertion position.");

// A top drop saves both the new order and active selection without advancing a turn.
var beforeDrop = participants.ToDictionary(item => item.Id,
    item => (item.TurnCount, item.CompletedThisRound, item.CurrentHp));
var beforeDropRound = encounter.Round;
EncounterStateTransitions.Reorder(encounter, [first, held, second], [second.Id, first.Id, held.Id], makeActive: true);
Check(encounter.ActiveParticipantId == second.Id && second.Position == 0 && first.Position == 1 && held.Position == 2,
    "A top drop did not move and activate the chosen participant together.");
EncounterStateTransitions.Reorder(encounter, [second, first, held], [second.Id, held.Id, first.Id]);
Check(encounter.ActiveParticipantId == second.Id, "An ordinary reorder changed the active participant.");
Check(encounter.Round == beforeDropRound && participants.All(item =>
    beforeDrop[item.Id] == (item.TurnCount, item.CompletedThisRound, item.CurrentHp)),
    "Reordering or top activation changed HP, turns, or Round completion.");
ordered = participants.OrderBy(item => item.Position).ToList();
EncounterStateTransitions.Release(encounter, ordered, third, targetIndex: 0, makeActive: true);
Check(encounter.ActiveParticipantId == third.Id && !third.IsHeld && third.Position == 0
    && encounter.Round == beforeDropRound && third.TurnCount == beforeDrop[third.Id].TurnCount,
    "Releasing a held participant at the top did not activate it without advancing counters.");

var max = NumericInputLimits.MaxCharacters;
Check(ExactDecimal.TryParse(new string('9', max), out var large)
    && large.ToString().Length == max, "A value at the input budget was rejected.");
Check(!ExactDecimal.TryParse(new string('9', max + 1), out _),
    "An oversized decimal was accepted.");
Check(GameNumberInput.TryInitiative(new string('9', max), out var largeInitiative)
    && largeInitiative?.Length == max, "A valid initiative at the input budget was rejected.");
Check(!GameNumberInput.TryInitiative(new string('9', max + 1), out _)
    && !GameNumberInput.TryHp(new string('9', max + 1), out _),
    "Oversized encounter numeric input was accepted.");
Check(!GameNumberInput.TryHp("." + new string('1', max - 1), out _),
    "HP input whose canonical form exceeds the budget was accepted.");
Check(GameNumberInput.TryHp("." + new string('1', max - 2), out var canonicalFraction)
    && canonicalFraction?.Length == max
    && ExactDecimal.TryParse(canonicalFraction, out _),
    "HP at the canonical representation budget cannot be read back.");
Check(ExactDecimal.TryParse("1", out var one)
    && !GameNumberInput.TryAdjustHp(large, one, heal: true, out _)
    && GameNumberInput.TryAdjustHp(large, one, heal: false, out var lower)
    && lower?.Length == max, "Exact arithmetic ignored the result budget.");
Check(ExactDecimal.TryParse("-9.5", out var dying) && dying.Status == "Dying"
    && ExactDecimal.TryParse("0.5", out var healing)
    && dying.Add(healing).ToString() == "-9", "Exact fractional arithmetic changed.");

await using var connection = new SqliteConnection("Data Source=:memory:");
await connection.OpenAsync();
var options = new DbContextOptionsBuilder<CampaignDataContext>().UseSqlite(connection).Options;
var campaignId = Guid.NewGuid();
var encounterId = Guid.NewGuid();
var pcId = Guid.NewGuid();
var npcId = Guid.NewGuid();
await using (var data = new CampaignDataContext(options))
{
    await data.Database.EnsureCreatedAsync();
    data.Campaigns.Add(new Campaign { Id = campaignId, OwnerUserId = "test-user", Name = "Test" });
    data.Encounters.Add(new Encounter { Id = encounterId, CampaignId = campaignId, Name = "Test" });
    data.Participants.AddRange(
        new EncounterParticipant { Id = pcId, EncounterId = encounterId, Position = 0, Initiative = "8" },
        new EncounterParticipant { Id = npcId, EncounterId = encounterId, Position = 1, Initiative = "12" });
    await data.SaveChangesAsync();
}

await using (var data = new CampaignDataContext(options))
{
    await using var transaction = await data.Database.BeginTransactionAsync();
    var savedEncounter = await data.Encounters.SingleAsync(item => item.Id == encounterId);
    var savedParticipants = await data.Participants.Where(item => item.EncounterId == encounterId)
        .OrderBy(item => item.Position).ToListAsync();
    var orderedForFight = EncounterStateTransitions.InitialOrder(savedParticipants);
    foreach (var item in savedParticipants) item.Position = -item.Position - 1;
    await data.SaveChangesAsync();
    EncounterStateTransitions.BeginFight(savedEncounter, savedParticipants, orderedForFight);
    savedEncounter.Revision++;
    await data.SaveChangesAsync();
    await transaction.CommitAsync();
}

await using (var data = new CampaignDataContext(options))
{
    var saved = await data.Encounters.AsNoTracking().SingleAsync(item => item.Id == encounterId);
    var savedOrder = await data.Participants.AsNoTracking().Where(item => item.EncounterId == encounterId)
        .OrderBy(item => item.Position).Select(item => item.Id).ToArrayAsync();
    Check(saved.Phase == EncounterPhase.Fight && saved.ActiveParticipantId == npcId
        && savedOrder.SequenceEqual([npcId, pcId]),
        "SQLite did not save the initial order and active participant together.");
}

await using (var data = new CampaignDataContext(options))
{
    await using var transaction = await data.Database.BeginTransactionAsync();
    var savedEncounter = await data.Encounters.SingleAsync(item => item.Id == encounterId);
    var savedParticipants = await data.Participants.Where(item => item.EncounterId == encounterId)
        .OrderBy(item => item.Position).ToListAsync();
    foreach (var item in savedParticipants) item.Position = -item.Position - 1;
    await data.SaveChangesAsync();
    EncounterStateTransitions.Hold(savedEncounter, savedParticipants, savedParticipants[0]);
    savedEncounter.Revision++;
    await data.SaveChangesAsync();
    await transaction.CommitAsync();
}

await using (var data = new CampaignDataContext(options))
{
    var saved = await data.Encounters.AsNoTracking().SingleAsync(item => item.Id == encounterId);
    var savedParticipants = await data.Participants.AsNoTracking()
        .Where(item => item.EncounterId == encounterId).OrderBy(item => item.Position).ToArrayAsync();
    Check(saved.ActiveParticipantId == pcId && savedParticipants[0].Id == pcId
        && savedParticipants[1].Id == npcId && savedParticipants[1].IsHeld,
        "SQLite did not save Hold and its active successor together.");
}

await using (var data = new CampaignDataContext(options))
{
    await using var transaction = await data.Database.BeginTransactionAsync();
    var savedEncounter = await data.Encounters.SingleAsync(item => item.Id == encounterId);
    var savedParticipants = await data.Participants.Where(item => item.EncounterId == encounterId)
        .OrderBy(item => item.Position).ToListAsync();
    foreach (var item in savedParticipants) item.Position = -item.Position - 1;
    await data.SaveChangesAsync();
    EncounterStateTransitions.Release(savedEncounter, savedParticipants, savedParticipants[1], 1);
    savedEncounter.Revision++;
    await data.SaveChangesAsync();
    await transaction.CommitAsync();
}

await using (var data = new CampaignDataContext(options))
{
    var saved = await data.Encounters.AsNoTracking().SingleAsync(item => item.Id == encounterId);
    var savedParticipants = await data.Participants.AsNoTracking()
        .Where(item => item.EncounterId == encounterId).OrderBy(item => item.Position).ToArrayAsync();
    Check(saved.ActiveParticipantId == pcId && savedParticipants[1].Id == npcId
        && !savedParticipants[1].IsHeld,
        "SQLite did not preserve active selection and release position.");
}

await using (var firstWriter = new CampaignDataContext(options))
await using (var staleWriter = new CampaignDataContext(options))
{
    var current = await firstWriter.Encounters.SingleAsync(item => item.Id == encounterId);
    var stale = await staleWriter.Encounters.SingleAsync(item => item.Id == encounterId);
    current.Name = "First writer";
    current.Revision++;
    await firstWriter.SaveChangesAsync();
    stale.Name = "Stale writer";
    stale.Revision++;
    var rejected = false;
    try { await staleWriter.SaveChangesAsync(); }
    catch (DbUpdateConcurrencyException) { rejected = true; }
    Check(rejected, "SQLite accepted a stale encounter revision.");
}

Check(ConditionCatalog.All.Count == 42 && ConditionCatalog.All.Count(item => item.Core) == 38,
    "The D&D 3.5 catalog does not contain 38 core conditions and four project-reference tags.");
Check(ConditionCatalog.All.Select(item => item.Kind).Distinct().Count() == ConditionCatalog.All.Count
    && ConditionCatalog.All.All(item => ConditionCatalog.Contains(item.Kind)
        && !string.IsNullOrWhiteSpace(item.Label) && !string.IsNullOrWhiteSpace(item.Summary)
        && Uri.TryCreate(item.Source, UriKind.Absolute, out _)),
    "Condition definitions have missing metadata, duplicate IDs, or unsupported kinds.");
Check(ConditionCatalog.Contains("Invisible") && ConditionCatalog.Contains("Grappled")
    && ConditionCatalog.Contains("Prone") && ConditionCatalog.Contains("Blinded")
    && ConditionCatalog.Contains("Stable") && !ConditionCatalog.Contains("Unsupported")
    && !ConditionCatalog.Contains(null), "Condition validation lost compatibility or accepted an unknown status.");
await using (var data = new CampaignDataContext(options))
{
    data.Conditions.AddRange(ConditionCatalog.All.Select(item => new ParticipantCondition
        { ParticipantId = pcId, Kind = item.Kind, AppliedAtTurnCount = 3 }));
    await data.SaveChangesAsync();
}
await using (var data = new CampaignDataContext(options))
{
    var savedConditions = await data.Conditions.AsNoTracking().Where(item => item.ParticipantId == pcId).ToArrayAsync();
    Check(savedConditions.Length == ConditionCatalog.All.Count && savedConditions.All(item => item.AppliedAtTurnCount == 3),
        "The expanded condition catalog did not survive a SQLite reload.");
}

Console.WriteLine("Encounter transitions, SQLite persistence, condition catalog, stale revisions, and numeric limits passed.");
