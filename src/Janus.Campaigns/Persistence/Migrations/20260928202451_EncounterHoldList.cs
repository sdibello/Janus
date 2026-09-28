using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Janus.Campaigns.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EncounterHoldList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsHeld",
                table: "EncounterParticipants",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsHeld",
                table: "EncounterParticipants");
        }
    }
}
