# Requirements.

1. Update the style of the text boxes and buttons in the "Add a PC, NPC, or mob" section to match the style of the cards in the battle screen.  This should be updated in the prepare and fight phases.
2. When preparing an encounter, add a button that adds all PCs and NPCs assigned to that campaign called "Add All "   It skips HP
3. In the prepare phase, while viewing the list of participants, treat that like a data table.  With the "Remove" button inline with the name.  While that row is highlighted, that is when you allow the user to edit the HP, otherwise it is hidden.
4. In the Prepare Phase - no need to make the "Add a PC, NPC, or mob collapsable - as it is the main feture of the page.
5. In the fight phase - the Manage section should automatically expand when the participant is active. And collapse when their turn is complete
6. in the fight phase - the "Set Active" button should be disabled if the participant is in fact the active participant.
7. New Status Rules - if HP = 0, the character is "disabled", risk of death. The card should be colored yellow.  -1 to -9 HP should be "dying" and they should be colored orange. -10 should remain unchanged.
8. Create a few new status ("invisible", "grappled", "prone") which can be added to any participant.  The status indicator should appear on the right side of the parcipant card only in the fight phase.  It should allow the user to cancel with an "x" in the status bubble. I think to apply this status to a participant, a icon should show in the card with some sorta of small icon, and pop up a status lightbox. Status can be added to anyone in the list, they do not need to be active.  Track how many turns that participant has had that stauts applied, which will show in the status bubble of each status.
9. In the fight phase - you can hide the initiative from display.
10. Hide the "Local Services" from the Campaigns screen.
11. Move the Encounters section on the Campaigns screen to the left column under Your Calpaigns.
12. When showing encounters on the Campaigns screen, group them by phase, always hiding the complete ones unless that section is expanded.  While showing any active fights at the top of that group.
