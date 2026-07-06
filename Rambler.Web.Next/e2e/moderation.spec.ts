import { test, expect, type Page } from "@playwright/test";

/**
 * Moderation smoke test: an owner promotes/demotes a second member and both
 * sessions see the notice line ("X was made an operator", "X is no longer ...").
 * Exercises AddModerator / RemoveModerator end to end plus the system messages
 * the chat store emits on a role change.
 */

// Server caps nicks at 15 chars (^[\w-_]{1,15}$), so keep the suffix short.
const stamp = Date.now().toString(36);

async function register(page: Page, nick: string) {
  await page.goto("/register");
  await page.getByPlaceholder("Username").fill(nick);
  await page.getByPlaceholder("Email").fill(`${nick}@example.com`);
  await page.getByPlaceholder("Password", { exact: true }).fill("Passw0rd!23");
  await page.getByPlaceholder("Confirm password").fill("Passw0rd!23");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/chat/, { timeout: 15000 });
}

test("owner promotes and demotes a member with notices", async ({ browser }) => {
  const room = `smoke-${stamp}`;
  const owner = `Own${stamp}`;
  const member = `Mem${stamp}`;

  const ownerCtx = await browser.newContext();
  const memberCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  const memberPage = await memberCtx.newPage();

  // Owner registers and creates the room (creating auto-joins as room owner).
  await register(ownerPage, owner);
  await ownerPage.getByRole("button", { name: "New room" }).click();
  const dialog = ownerPage.getByRole("dialog", { name: "Create a room" });
  await dialog.locator("#create-room-name").fill(room);
  await dialog.getByRole("button", { name: "Create room" }).click();
  await expect(ownerPage.getByRole("heading", { name: "Who's here" })).toBeVisible();

  // Member registers, then joins the owner's room by name via the room browser.
  await register(memberPage, member);
  await memberPage.getByRole("button", { name: "Browse rooms" }).click();
  const browse = memberPage.getByRole("dialog", { name: "Browse rooms" });
  await browse.getByPlaceholder("room name").fill(room);
  await browse.getByRole("button", { name: "Join" }).click();
  // Both sides should now see the member in the room.
  await expect(ownerPage.locator(".roster")).toContainText(member, { timeout: 15000 });

  // Owner opens the member's action menu and makes them an operator.
  async function pick(action: string) {
    const memberRow = ownerPage.locator(".member", { hasText: member });
    await memberRow.hover();
    await memberRow.getByRole("button", { name: `More actions for ${member}` }).click();
    await ownerPage.getByRole("menuitem", { name: action }).click();
  }

  const notice = (page: Page, text: string) =>
    expect(page.locator(".sysline").filter({ hasText: text })).toBeVisible({ timeout: 10000 });

  await pick("Make Operator");
  await notice(ownerPage, `${member} was made an operator`);
  await notice(memberPage, `${member} was made an operator`);

  // Demote back to a plain member.
  await pick("Remove role");
  await notice(ownerPage, `${member} is no longer an operator`);
  await notice(memberPage, `${member} is no longer an operator`);

  // And a moderator promotion produces its own notice.
  await pick("Make Moderator");
  await notice(memberPage, `${member} was made a moderator`);

  await ownerCtx.close();
  await memberCtx.close();
});
