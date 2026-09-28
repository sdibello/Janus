using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Janus.Campaigns.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AlphaRoundProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CompletedThisRound",
                table: "EncounterParticipants",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletedThisRound",
                table: "EncounterParticipants");
        }
    }
}
