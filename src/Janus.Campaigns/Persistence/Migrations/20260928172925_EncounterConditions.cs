using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Janus.Campaigns.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class EncounterConditions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ParticipantConditions",
                columns: table => new
                {
                    ParticipantId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", nullable: false),
                    AppliedAtTurnCount = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ParticipantConditions", x => new { x.ParticipantId, x.Kind });
                    table.ForeignKey(
                        name: "FK_ParticipantConditions_EncounterParticipants_ParticipantId",
                        column: x => x.ParticipantId,
                        principalTable: "EncounterParticipants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ParticipantConditions");
        }
    }
}
