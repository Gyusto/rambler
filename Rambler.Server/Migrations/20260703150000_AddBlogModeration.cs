using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using System;
using System.Collections.Generic;

namespace Rambler.Server.Migrations
{
    public partial class AddBlogModeration : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsGuest",
                table: "BlogComments",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "BlogPostStates",
                columns: table => new
                {
                    Id = table.Column<long>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.SerialColumn),
                    CommentsDisabled = table.Column<bool>(nullable: false),
                    Hidden = table.Column<bool>(nullable: false),
                    Slug = table.Column<string>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BlogPostStates", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BlogPostStates_Slug",
                table: "BlogPostStates",
                column: "Slug",
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BlogPostStates");

            migrationBuilder.DropColumn(
                name: "IsGuest",
                table: "BlogComments");
        }
    }
}
