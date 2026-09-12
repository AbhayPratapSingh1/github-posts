Implement Optimistic UI Updates for Mutations

You are working on the existing github-posts repository.

Before making any changes, inspect the existing codebase thoroughly and understand:

client/
backend-fastapi/
Existing API/service functions
Existing state management patterns
Existing loading/error handling
Existing components for posts, comments, likes, etc.
Existing hooks/utilities
Existing OpenCode skills/context in .opencode/
Existing tests, if any

Do NOT introduce a new state-management library or architectural pattern unless the existing code genuinely requires it.

Repository:
https://github.com/AbhayPratapSingh1/github-posts

Goal

Improve the application's perceived responsiveness by implementing optimistic UI updates for small, reversible user actions.

The general behavior should be:

User action
    ↓
Immediately update UI optimistically
    ↓
Send request to backend
    ↓
Backend succeeds?
    ├── YES → Keep optimistic state
    └── NO  → Roll back to previous state


The user should not have to wait for the API request before seeing the UI respond.

1. Optimistic updates

Identify all existing user actions where the UI can safely update immediately before waiting for the backend.

Examples include, but are not limited to:

Like / unlike a post
Add/remove reaction
Add comment
Delete comment
Edit comment
Bookmark/save/unsave
Follow/unfollow
Any similar small mutation already implemented in the application

Do not assume these are the only mutations. Inspect the codebase and identify the actual mutations that exist.

For each suitable mutation:

Before API request

Immediately update the UI.

For example, for a like:

Before:
♡ 10

User clicks like

Immediately:
♥ 11

API request starts in background


If the API succeeds:

♥ 11


Keep the state.

If the API fails:

♡ 10


Restore the exact previous state.

2. Rollback must be reliable

The optimistic update must preserve enough information to restore the previous state.

Do not simply refetch the entire page as the default rollback mechanism.

Prefer:

previousState
    ↓
optimisticState
    ↓
API request
    ↓
success → keep optimisticState
failure → restore previousState


The rollback should restore all relevant UI state, not just one field.

For example, if liking a post changes:

liked
likeCount

then rollback both values if the request fails.

3. Handle API failures

When an optimistic mutation fails:

Restore the previous UI state.
Do not leave the UI in a state that differs from the backend.
Show an appropriate error/toast/notification if the application already has an error notification mechanism.
Do not crash the component.
Make sure the failed request does not leave stale loading/pending state behind.

Use the application's existing error-handling and notification patterns where possible.

Do not introduce a second notification system unnecessarily.

4. Prevent duplicate/racing mutations

Inspect the existing application behavior and make optimistic updates safe when users click quickly.

For example:

User clicks Like
    ↓
UI immediately becomes liked
    ↓
Request A starts

User immediately clicks Unlike
    ↓
UI immediately becomes unliked
    ↓
Request B starts


Avoid allowing an older API response to incorrectly overwrite a newer user action.

If necessary, use one of the following approaches depending on the existing architecture:

mutation/request IDs
request sequencing
aborting stale requests
serialized mutations
another lightweight mechanism appropriate for the existing codebase

Do not over-engineer this if the application already has a suitable mechanism.

5. Comments

Comments should feel immediate.

Adding a comment

When the user submits a comment:

User submits
    ↓
Immediately show the comment in the comment list
    ↓
Send API request
    ↓
Success → keep it
Failure → remove the optimistic comment / restore previous state


For an optimistic comment, use a temporary client-side ID if necessary.

The optimistic comment may have a temporary/pending state if that fits the existing UI.

Once the backend responds successfully, reconcile the optimistic comment with the real backend comment.

Do not accidentally create duplicate comments.

Example:

Before:
[Comment A]

User submits "Nice post!"

Immediately:
[Comment A]
[Nice post!]

Backend responds:
[Comment A]
[Nice post!]  ← replace temporary comment with real backend comment


Not:

[Comment A]
[Nice post!]
[Nice post!]  ← duplicate

6. Deleting comments

For deleting a comment:

User clicks delete
    ↓
Immediately remove comment from UI
    ↓
Send DELETE request
    ↓
Success → keep it removed
Failure → restore the comment to its original position


Preserve enough information to restore the comment correctly if deletion fails.

Do not simply append the restored comment to the end unless that is already how the application behaves.

7. Editing comments

If comment editing exists:

User submits edit
    ↓
Immediately show edited text
    ↓
Send API request
    ↓
Success → keep edited text
    ↓
Failure → restore original text


Preserve the original value until the request has completed.

8. Actions that should NOT be optimistic

Do not force optimistic behavior onto operations where the client does not have enough information to construct the final result.

For example:

Creating/uploading a new post

For a page/action such as:

Create new post
Upload post
Publish post


keep the normal loading behavior.

Expected flow:

User submits post
    ↓
Show loader/loading state
    ↓
Send request
    ↓
Wait for backend response
    ↓
Success → display/navigate to created post
Failure → show error


This is intentional.

A newly created post may depend on backend-generated information such as:

post ID
timestamps
server-generated metadata
uploaded file URLs
processed images
author information
other backend-generated fields

Therefore, do not create a fake optimistic post unless the existing architecture already supports this cleanly.

9. Uploads/files

For file/image uploads, use proper loading/progress behavior rather than pretending the server operation has completed.

The UI should clearly communicate that the upload is in progress.

If the existing application already has upload progress support, preserve and improve it rather than replacing it.

10. Loading indicators for optimistic mutations

Do not block the entire UI while a small optimistic mutation is being confirmed.

For example, when liking a post:

BAD:

[Entire page disabled]
Loading...


GOOD:

♥ 11


The UI has already changed.

If appropriate, show a small local pending indicator on the affected control.

For example:

♥ 11  · pending


or a subtle disabled state on just the button.

Do not make the whole page wait for a like/comment API request.

11. React/state management

First inspect how the client currently manages state.

Follow the application's existing architecture.

If the application uses:

React local state → use it where appropriate.
Context → follow the existing context pattern.
React Query/TanStack Query → use mutation APIs and optimistic update mechanisms where appropriate.
Redux/Zustand/etc. → follow the existing store pattern.

Do not introduce Redux, Zustand, React Query, or another library merely to implement this feature if the project does not already use it.

The implementation should feel native to the existing codebase.

12. Avoid duplicated API logic

Before adding new API calls, inspect the existing API/service layer.

If there is already something like:

likePost()
unlikePost()
createComment()
deleteComment()


reuse it.

Do not duplicate backend request logic inside UI components.

Keep responsibilities separated:

UI
 ↓
mutation/action
 ↓
existing API/service layer
 ↓
backend

13. Cache/state consistency

After implementing optimistic updates, make sure different parts of the UI remain consistent.

For example, if a post appears in:

feed
post detail
profile
comments section

and the user likes the post from one location, inspect whether the other views need to update as well.

Use the application's existing state-sharing/cache mechanism where possible.

Avoid introducing unnecessary global state.

14. Error handling

Use the existing application's error UX.

For example:

Optimistic action
      ↓
API fails
      ↓
Rollback
      ↓
Show "Something went wrong. Please try again."


The important part is:

The UI must never remain optimistically changed after a confirmed backend failure.

15. Code quality

Keep the implementation:

small
reusable
predictable
type-safe
easy to understand
consistent with the current architecture

If several mutations use the exact same optimistic-update pattern, consider creating a small reusable abstraction/helper.

However, do not create a large generic "optimistic framework" for the application.

Prefer simple abstractions such as:

optimistic mutation helper


only if it genuinely reduces duplication.

16. Race conditions

Pay particular attention to:

Like → unlike → like quickly
Comment submit multiple times
Delete → restore/reload
Edit comment multiple times quickly
Multiple mutations on different posts simultaneously

A response from an older request must not incorrectly overwrite a newer UI state.

17. UX requirements

The final experience should feel like a modern social application.

Small actions should feel instant:

Like       → instant
Unlike     → instant
Comment    → instant
Delete     → instant
Bookmark   → instant
Follow     → instant


Large/server-dependent operations should show loading:

Create post → loader
Upload file → loader/progress
Publish     → loader


The distinction is intentional.

18. Testing

After implementing the changes, test at minimum:

Success cases
Like succeeds
Unlike succeeds
Comment creation succeeds
Comment deletion succeeds
Comment editing succeeds
Any other existing small mutation succeeds
Failure cases

Simulate/force API failures and verify:

optimistic state appears immediately
backend request is made
UI rolls back on failure
error notification appears if appropriate
no stale pending state remains
Race cases

Test rapid:

like/unlike
like/unlike/like
multiple comment operations
Large operations

Verify that:

creating a post still shows a loader
uploading files still shows loading/progress
failed creation/upload leaves the UI in a correct state
19. Important implementation process

Do NOT immediately start modifying files.

First:

Inspect the repository structure.
Identify the frontend framework and state-management approach.
Identify all existing mutation/API functions.
Identify the components responsible for each mutation.
Identify existing loading/error/toast patterns.
Identify whether there are existing optimistic-update utilities.
Create a short implementation plan.
Then implement the changes.

Before finishing, review the diff and remove unnecessary changes.

Do not modify unrelated functionality.

20. Definition of done

This task is complete when:

Small reversible mutations update the UI immediately.
Backend requests happen after the optimistic UI update.
Successful requests leave the optimistic state intact.
Failed requests correctly restore the previous state.
Comments do not duplicate when reconciled with backend responses.
Rapid user actions do not result in stale API responses corrupting the UI.
Create/upload/publish flows continue to use proper loading states.
Existing API/service architecture is reused.
Existing notification/error handling is reused.
No unnecessary dependency is introduced.
The implementation is consistent with the existing codebase.
Relevant tests/manual verification have been completed.

After implementation, provide a concise summary of:

files changed
mutations converted to optimistic updates
rollback strategy
how race conditions were handled
which operations intentionally remain non-optimistic
tests/checks performed