using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Janus.Campaigns.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCampaign : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Campaigns",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OwnerUserId = table.Column<string>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Campaigns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CampaignCharacters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CampaignCharacters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CampaignCharacters_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Encounters",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CampaignId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Phase = table.Column<string>(type: "TEXT", nullable: false),
                    Round = table.Column<int>(type: "INTEGER", nullable: false),
                    ActiveParticipantId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Revision = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Encounters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Encounters_Campaigns_CampaignId",
                        column: x => x.CampaignId,
                        principalTable: "Campaigns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "EncounterParticipants",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    EncounterId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CharacterId = table.Column<Guid>(type: "TEXT", nullable: true),
                    MobName = table.Column<string>(type: "TEXT", nullable: true),
                    Initiative = table.Column<string>(type: "TEXT", nullable: true),
                    CurrentHp = table.Column<string>(type: "TEXT", nullable: true),
                    Position = table.Column<int>(type: "INTEGER", nullable: false),
                    TurnCount = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EncounterParticipants", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EncounterParticipants_CampaignCharacters_CharacterId",
                        column: x => x.CharacterId,
                        principalTable: "CampaignCharacters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_EncounterParticipants_Encounters_EncounterId",
                        column: x => x.EncounterId,
                        principalTable: "Encounters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CampaignCharacters_CampaignId",
                table: "CampaignCharacters",
                column: "CampaignId");

            migrationBuilder.CreateIndex(
                name: "IX_Campaigns_OwnerUserId",
                table: "Campaigns",
                column: "OwnerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_EncounterParticipants_CharacterId",
                table: "EncounterParticipants",
                column: "CharacterId");

            migrationBuilder.CreateIndex(
                name: "IX_EncounterParticipants_EncounterId_CharacterId",
                table: "EncounterParticipants",
                columns: new[] { "EncounterId", "CharacterId" },
                unique: true,
                filter: "\"CharacterId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_EncounterParticipants_EncounterId_Position",
                table: "EncounterParticipants",
                columns: new[] { "EncounterId", "Position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Encounters_CampaignId",
                table: "Encounters",
                column: "CampaignId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EncounterParticipants");

            migrationBuilder.DropTable(
                name: "CampaignCharacters");

            migrationBuilder.DropTable(
                name: "Encounters");

            migrationBuilder.DropTable(
                name: "Campaigns");
        }
    }
}
