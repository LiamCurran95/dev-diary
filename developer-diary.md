---
### 📝 refactor: strongly type the `accountStatus` query - 📅 2025-07-21

**🔗 PR:** [#6572](https://github.com/LegitFit/legitfit/pull/6572)  

**🔍 Summary:**  
Refactored the `accountStatus` query to use strong typing, removing reliance on `as any` in the User mongoose model.

**📌 Details:**  
Replaced all instances of `as any` with explicit type definitions in the User mongoose model, ensuring type safety and consistency across the codebase. This change leverages the project's defined types, reducing the risk of runtime errors and improving code maintainability. The refactor aligns with best practices for TypeScript and enhances overall code quality.

**⚙️ Performance:**  
No direct performance impact; improvements are focused on type safety and maintainability.



---

### 📝 refactor: remove default stripe key - 📅 2025-07-18

**🔗 PR:** [#6566](https://github.com/LegitFit/legitfit/pull/6566)

**🔍 Summary:**  
Removed the default value for the `STRIPE_SECRET_KEY` environment variable to enhance security and prevent accidental use of the production Stripe key.

**📌 Details:**  
Refactored configuration handling by eliminating the default assignment of the Stripe secret key. This change ensures that the application will not inadvertently use a live production key in development, testing, or scripting environments, reducing the risk of exposing sensitive production data. The update enforces explicit configuration, aligning with best practices for managing secrets and environment variables.

**⚙️ Performance:**  
No direct performance impact; the change focuses on improving security and configuration safety.

---

### 📝 chore: tidy up `stripeTypeguards` - 📅 2025-07-17

**🔗 PR:** [#6565](https://github.com/LegitFit/legitfit/pull/6565)

**🔍 Summary:**  
Performed code cleanup and refactoring of the `stripeTypeguards` module to improve maintainability and code quality.

**📌 Details:**  
Reviewed and reorganized the `stripeTypeguards` codebase, removing redundant logic and ensuring consistent naming conventions. This tidy-up aims to make the type guard utilities easier to understand and maintain, reducing technical debt and potential for future bugs.

**⚙️ Performance:**  
No direct performance improvements were targeted; changes focused on code clarity and maintainability.

---

### 📝 chore: remove ununused log - 📅 2025-07-17

**🔗 PR:** [#6564](https://github.com/LegitFit/legitfit/pull/6564)

**🔍 Summary:**  
Removed an unused log statement that was originally added for validation purposes but is no longer necessary.

**📌 Details:**  
Reviewed and cleaned up code by eliminating a log entry that was intended for a validation process which has not yet been implemented. This helps maintain code clarity and reduces unnecessary output in the logs.

**⚙️ Performance:**  
No direct performance impact, but minor improvement in log cleanliness and potential reduction in noise during debugging.

---

---

### 📝 fix: preventing overbooking on public events - 📅 2025-07-21

**🔗 PR:** [#6563](https://github.com/LegitFit/legitfit/pull/6563)

**🔍 Summary:**  
Resolved an issue where public events could be overbooked, ensuring that the number of bookings does not exceed the available slots.

**📌 Details:**  
Implemented logic to prevent concurrent overbooking scenarios by introducing booking holds during the reservation process. The update ensures that when multiple users attempt to book the last available slots simultaneously, only one booking is processed successfully, and others receive an error. Additional validation was added for scenarios involving Strong Customer Authentication (SCA), including handling booking holds during SCA and cleaning up holds if SCA fails.

**⚙️ Performance:**  
Improved booking reliability and data integrity for public events, reducing the risk of overbooking and associated customer support issues.

---

### 📝 chore: `ActivePurchasedServiceSchema` cleanup - 📅 2025-07-17

**🔗 PR:** [#6553](https://github.com/LegitFit/legitfit/pull/6553)

**🔍 Summary:**  
Reviewed and cleaned up the `ActivePurchasedServiceSchema` to address issues with undefined fields and reduce unnecessary log noise.

**📌 Details:**  
Identified and removed excessive logging related to a field in `ActivePurchasedServiceSchema` that can be undefined. This cleanup was prompted by recurring log entries observed during routine log reviews. The changes improve code clarity and help prevent confusion or false alarms in monitoring by ensuring only relevant information is logged.

**⚙️ Performance:**  
No direct impact on application performance, but the reduction in log volume may improve log processing efficiency and developer experience during debugging.

---

### 📝 chore: add `developer` to additionalData to create personal dashboard - 📅 2025-07-16

**🔗 PR:** [#6552](https://github.com/LegitFit/legitfit/pull/6552)

**🔍 Summary:**  
Added a `developer` field to the `additionalData` object to enable tracking and visualization of unique log counts for personal dashboards.

**📌 Details:**  
This update introduces the `developer` attribute within `additionalData`, laying the groundwork for generating dashboards that display counts of specific logs per developer. The change supports improved monitoring and analytics for individual developer activities, facilitating more granular insights and reporting.

**⚙️ Performance:**  
No direct performance impact expected; the change is structural and intended to enhance future data analysis capabilities.

---

### 📝 perf: utilise `asyncBatch` and dispatch for `sendMessageToSQS` - 📅 2025-07-21

**🔗 PR:** [#6551](https://github.com/LegitFit/legitfit/pull/6551)

**🔍 Summary:**  
Refactored the message sending logic to SQS by replacing direct `await` calls with `dispatch`, and introduced `asyncBatch` for batching email operations.

**📌 Details:**

- Updated the `sendMessageToSQS` workflow to use `dispatch` instead of `await`, improving both performance and safety compared to using `void`.
- Replaced instances of `asyncForEach` with `asyncBatch` for email processing, enabling more efficient batch handling and reducing overhead.
- These changes streamline asynchronous operations and align with best practices for handling concurrent tasks in Node.js.

**⚙️ Performance:**

- Anticipated improved throughput and reduced latency for SQS message dispatching due to non-blocking execution.
- Batching emails with `asyncBatch` is expected to decrease processing time and resource usage compared to sequential async iteration.

---

---

### 📝 fix: filter select listview - 📅 2025-07-15

**🔗 PR:** [#6545](https://github.com/LegitFit/legitfit/pull/6545)

**🔍 Summary:**  
Resolved an issue where the filter options (pending, frozen, expired) were not functioning correctly in the memberships list view.

**📌 Details:**  
Investigated and fixed a bug affecting the filter functionality for memberships. The filters for pending, frozen, and expired statuses were not applying as expected, impacting user ability to segment membership records. The solution involved correcting the logic handling filter selection and ensuring the UI updates accurately reflect the selected filter state. This fix aligns the list view behavior with user expectations and documented requirements.

**⚙️ Performance:**  
No direct performance changes were introduced; the update focused on restoring correct filter behavior and improving user experience.

---

### 📝 chore: noMatch for purchased service lists - 📅 2025-07-15

**🔗 PR:** [#6540](https://github.com/LegitFit/legitfit/pull/6540)

**🔍 Summary:**  
Updated the UI for the "no match" state in purchased service lists to improve user experience and visual clarity.

**📌 Details:**  
Refactored the display logic and design for scenarios where no purchased services are found. The update replaces the previous "no match" message and layout with a more informative and visually appealing alternative, as shown in the before-and-after screenshots. This change aims to provide clearer feedback to users and maintain consistency with the application's design standards.

**⚙️ Performance:**  
No direct performance impact; changes are limited to UI presentation and user feedback improvements.

---

---

### 📝 fix: setup sessionLimitModification when assigning - 📅 2025-07-15

**🔗 PR:** [#6539](https://github.com/LegitFit/legitfit/pull/6539)

**🔍 Summary:**  
Addressed a bug related to session limit modification by ensuring proper setup during assignment, preventing issues caused by rapid successive save operations.

**📌 Details:**  
Identified and resolved a race condition where calling `.save()` twice in quick succession could result in incomplete data propagation across database shards. The fix ensures that `sessionLimitModification` is correctly set up before assignment, improving data consistency and reliability. This change directly addresses a bug tracked in the engineering board.

**⚙️ Performance:**  
Improved data consistency and reduced the risk of race conditions during save operations, leading to more reliable system behavior under concurrent usage.

---

### 📝 chore: log errors in createClientCustomer - 📅 2025-07-15

**🔗 PR:** [#6537](https://github.com/LegitFit/legitfit/pull/6537)

**🔍 Summary:**  
Added error logging to the `createClientCustomer` operation to capture and diagnose issues, particularly timeouts.

**📌 Details:**  
Implemented enhanced error logging within the `createClientCustomer` function to record error details, including specific error codes such as 50, which indicates a timeout. This change aims to improve visibility into operational failures and facilitate faster debugging and resolution of client creation issues.

**⚙️ Performance:**  
No direct performance improvements, but increased observability will help identify and address timeout problems more efficiently.

---

### 📝 fix: churned membership total - 📅 2025-07-15

**🔗 PR:** [#6534](https://github.com/LegitFit/legitfit/pull/6534)

**🔍 Summary:**  
Resolved an issue where the churned membership total was displaying an incorrect value in the reporting dashboard.

**📌 Details:**  
Identified and corrected a calculation error affecting the `total` value for churned memberships. The fix ensures that the displayed total now accurately reflects the underlying data. This adjustment improves the reliability of membership analytics and reporting for end users.

**⚙️ Performance:**  
No direct performance impact observed; the fix enhances data accuracy without affecting load times or system responsiveness.

---

---

### 📝 revert: "refactor: gh runners 10 shards" - 📅 2025-07-14

**🔗 PR:** [#6533](https://github.com/LegitFit/legitfit/pull/6533)

**🔍 Summary:**  
This pull request reverts a previous refactor that introduced 10-shard parallelization for GitHub Actions runners.

**📌 Details:**  
The revert was necessary due to unforeseen issues or instability caused by the earlier sharding refactor. The codebase has been restored to its prior state to maintain CI reliability. Further investigation will be required before reattempting this optimization.

**⚙️ Performance:**  
No direct performance improvements; this change prioritizes stability over the previously attempted CI speedup.

---

### 📝 refactor: gh runners 10 shards - 📅 2025-07-14

**🔗 PR:** [#6531](https://github.com/LegitFit/legitfit/pull/6531)

**🔍 Summary:**  
Refactored the GitHub Actions runner configuration to reduce the number of shards from 20 to 10, aiming to optimize CI resource usage.

**📌 Details:**  
After observing that 20 shards may have been excessive for our current workload, I updated the CI pipeline to use 10 shards instead. This change is intended to balance parallelism with resource efficiency, potentially reducing overhead and improving maintainability of the workflow configuration.

**⚙️ Performance:**  
Expected to decrease unnecessary resource consumption and improve CI stability by preventing over-sharding. Will monitor subsequent runs for build times and resource utilization.

---

### 📝 chore: filter client connections - 📅 2025-07-14

**🔗 PR:** [#6528](https://github.com/LegitFit/legitfit/pull/6528)

**🔍 Summary:**  
Implemented tracking for how frequently users filter the client list within the application.

**📌 Details:**  
Added instrumentation to monitor and log user interactions with the client list filtering feature. This enhancement aims to provide better insights into user behavior and feature usage, supporting future decisions on UI improvements and feature prioritization.

**⚙️ Performance:**  
No direct performance impact observed; the added tracking is lightweight and should not affect client-side responsiveness.

---

---

### 📝 chore: chart interaction tracking - 📅 2025-07-14

**🔗 PR:** [#6527](https://github.com/LegitFit/legitfit/pull/6527)

**🔍 Summary:**  
Implemented tracking for user interactions with charts to improve analytics and user behavior insights.

**📌 Details:**  
Added instrumentation to capture and log user actions on chart components. This enables the product and analytics teams to better understand feature engagement and identify areas for UX improvement. The changes were scoped to ensure minimal impact on existing chart functionality and maintain codebase cleanliness.

**⚙️ Performance:**  
No significant performance impact expected, as tracking was implemented using lightweight event listeners and asynchronous logging.

---

---

### 📝 refactor: bulk freeze memberships with batch function - 📅 2025-07-14

**🔗 PR:** [#6524](https://github.com/LegitFit/legitfit/pull/6524)

**🔍 Summary:**  
Refactored the membership freeze/unfreeze process to handle multiple memberships in batches, improving efficiency and reducing processing time.

**📌 Details:**  
Replaced the previous approach of freezing or unfreezing memberships one at a time with a new batch function that processes up to 10 memberships simultaneously. This change streamlines the workflow, reduces repetitive database operations, and enhances maintainability. The update was tested by assigning multiple memberships to clients and verifying correct batch processing.

**⚙️ Performance:**  
Observed a significant reduction in processing time: freezing/unfreezing 5 memberships now takes ~3 seconds (down from ~6 seconds), and 10 memberships also complete in ~3 seconds (down from ~10 seconds).

---

---

### 📝 refactor: default filtering membership table - 📅 2025-07-11

**🔗 PR:** [#6518](https://github.com/LegitFit/legitfit/pull/6518)

**🔍 Summary:**  
Implemented default filtering behavior on the memberships page when users navigate from the reports page via the "View Active" or "View Churned" options.

**📌 Details:**  
Refactored the memberships table to automatically apply the appropriate filter based on the user's selection in the reports page. This ensures that when users click "View Active" or "View Churned," they are redirected to the memberships page with the relevant filter pre-applied, improving workflow efficiency and user experience. The changes streamline navigation and reduce manual filtering steps for end users.

**⚙️ Performance:**  
No direct performance improvements were targeted, but the user flow is now more efficient, reducing the number of actions required to access filtered membership data.

---

### 📝 feat: CTA in Message Automations (hidden by feature-flag) - 📅 2025-07-14

**🔗 PR:** [#6517](https://github.com/LegitFit/legitfit/pull/6517)

**🔍 Summary:**  
Implemented the user interface for Call to Actions (CTAs) within the Message Automations feature, currently gated behind a feature flag.

**📌 Details:**  
Developed and integrated the UI components necessary for Message Automations CTAs, ensuring they are not visible to end users until the feature is enabled. This approach allows for further internal testing and iteration without impacting the production environment. The implementation aligns with ongoing efforts to enhance user engagement through automated messaging workflows.

**⚙️ Performance:**  
No performance impacts observed or anticipated, as the new UI is feature-flagged and does not affect existing user flows.

---

### 📝 revert: "test: ignore" - 📅 2025-07-10

**🔗 PR:** [#6516](https://github.com/LegitFit/legitfit/pull/6516)

**🔍 Summary:**  
Reverted a previous commit that ignored certain tests, restoring the original test configuration.

**📌 Details:**  
This pull request reverts the changes introduced in PR #6511, which had temporarily set some tests to be ignored. The decision to revert was made to reinstate the full test suite, ensuring comprehensive test coverage and maintaining code quality standards.

**⚙️ Performance:**  
No direct performance impact; test coverage and validation processes are restored to their prior state.

---

### 📝 chore: signup link via timetable share links - 📅 2025-07-10

**🔗 PR:** [#6513](https://github.com/LegitFit/legitfit/pull/6513)

**🔍 Summary:**  
Enabled the inclusion of signup links within timetable share links to streamline the user onboarding process.

**📌 Details:**  
Implemented changes to generate and append signup links when users share timetables, making it easier for new users to register directly from shared content. This update supports improved user acquisition and simplifies the referral workflow. No major refactoring or bug fixes were involved; the focus was on enhancing the sharing feature.

**⚙️ Performance:**  
No significant performance impact expected, as the changes primarily affect link generation and sharing logic.

---

### 📝 test: ignore - 📅 2025-07-10

**🔗 PR:** [#6511](https://github.com/LegitFit/legitfit/pull/6511)

**🔍 Summary:**  
Evaluated and documented the current CI/CD runner setup, focusing on optimizing end-to-end (E2E) test execution and cost efficiency.

**📌 Details:**  
Reviewed the allocation of self-hosted and GitHub runners for deployments and E2E tests. Currently, 5 self-hosted machines are used, with a cap of 4 for E2E tests to prevent PR check bottlenecks. The analysis highlighted the limitations of the current sharding approach (1 machine = 1 shard) and the continuous cost of running self-hosted runners. Explored the benefits of switching to GitHub-hosted runners, which allow dynamic scaling (spinning up X runners for X shards) and pay-per-minute billing, potentially reducing costs and increasing flexibility.

**⚙️ Performance:**  
Potential for improved E2E test throughput and reduced CI/CD costs by leveraging on-demand GitHub runners and parallelization.

---

### 📝 fix: new shared stripe user - 📅 2025-07-10

**🔗 PR:** [#6510](https://github.com/LegitFit/legitfit/pull/6510)

**🔍 Summary:**  
Replaced the previous shared Stripe user account with a new one after the original was removed.

**📌 Details:**  
The old shared Stripe user was no longer available ("nuked"), so I created and integrated a new shared Stripe user for the team. This ensures continued access to Stripe services for development and testing environments. All relevant configuration and credentials were updated to reflect the new user.

**⚙️ Performance:**  
No direct performance impact; this change restores essential Stripe functionality for the team.

---

### 📝 fix: cleanup script - 📅 2025-07-10

**🔗 PR:** [#6506](https://github.com/LegitFit/legitfit/pull/6506)

**🔍 Summary:**  
Addressed issues in an existing script by performing a cleanup to improve reliability and maintainability.

**📌 Details:**  
Reviewed and refactored the script to remove redundant code, fix minor bugs, and enhance code readability. Ensured that the script adheres to current project standards and best practices, reducing technical debt and potential sources of error.

**⚙️ Performance:**  
No direct performance improvements measured, but codebase maintainability and future scalability are enhanced.

---

### 📝 fix: issue with CSV uploads customStartDate during DST - 📅 2025-07-09

**🔗 PR:** [#6499](https://github.com/LegitFit/legitfit/pull/6499)

**🔍 Summary:**  
Resolved a bug where uploading a CSV with a custom start date during Daylight Saving Time (DST) incorrectly set the date to 11pm the previous day.

**📌 Details:**  
Adjusted the date handling logic for CSV uploads to ensure that custom start dates during DST are accurately recorded as the intended date, rather than being offset by one hour. This fix addresses user confusion and data integrity issues related to time zone and DST calculations.

**⚙️ Performance:**  
No direct performance impact; the update improves data accuracy and user experience for date-sensitive uploads.

---

### 📝 chore: logging for `createCharge` query - 📅 2025-07-08

**🔗 PR:** [#6495](https://github.com/LegitFit/legitfit/pull/6495)

**🔍 Summary:**  
Introduced additional logging to the `createCharge` query to investigate user booking patterns, specifically cases where one user books for multiple others, often new to the platform.

**📌 Details:**  
Implemented targeted logs to capture data on multi-user bookings, with a focus on scenarios frequently reported by Community Sauna partners. The goal is to verify if a single user is purchasing on behalf of several new users, which is suspected to be a common use case. This diagnostic step aims to provide actionable insights for future improvements or bug fixes.

**⚙️ Performance:**  
No direct performance impact expected; logging is scoped to support analysis without affecting core transaction flow.

---

### 📝 fix: remove additional MRR chart - 📅 2025-07-08

**🔗 PR:** [#6494](https://github.com/LegitFit/legitfit/pull/6494)

**🔍 Summary:**  
Removed an extra Monthly Recurring Revenue (MRR) chart from the application to streamline the reporting interface.

**📌 Details:**  
Identified and eliminated a redundant MRR chart component that was causing confusion and clutter in the analytics dashboard. This change improves the clarity of financial reporting and aligns the dashboard with current product requirements. No other analytics or data processing logic was affected.

**⚙️ Performance:**  
No direct performance impact observed; UI rendering may be marginally improved due to reduced component load.

---

### 📝 feat: CSV upload - modify credits - 📅 2025-07-08

**🔗 PR:** [#6493](https://github.com/LegitFit/legitfit/pull/6493)

**🔍 Summary:**  
Enhanced the CSV bulk upload feature to support modifying session credits for clients during the upload process.

**📌 Details:**

- Updated the CSV processing logic to allow both the addition and reduction of session credits for clients, including handling cases where credits may fall below zero.
- Extended the CSV template and validation to accommodate new credit modification fields.
- Updated documentation and provided a step-by-step guide for testing the new workflow, including integration with Stripe customer IDs.
- Conducted manual testing with various scenarios (e.g., adding/removing credits, edge cases with negative credits) to ensure robustness.

**⚙️ Performance:**  
No significant performance impact expected, as changes are limited to the CSV upload workflow and related data processing.

---

---

### 📝 feat: churned memberships - 📅 2025-07-09

**🔗 PR:** [#6487](https://github.com/LegitFit/legitfit/pull/6487)

**🔍 Summary:**  
Implemented a new API endpoint `churnedMemberships` and added a corresponding graph to the Payments reports dashboard to visualize churned memberships over a selected timeframe.

**📌 Details:**

- Developed a new GraphQL mutation for retrieving churned memberships data (V2 API).
- Integrated a new graph into the Payments dashboard to display churned memberships, enabling users to track membership attrition alongside active memberships.
- Ensured that the churned memberships graph inversely mirrors changes in active memberships, providing clear insight into membership trends.
- Updated the dashboard only; no changes were made to the app or V1 API.
- No new tests were added in this iteration.

**⚙️ Performance:**  
No explicit performance impacts noted. The new graph and API endpoint are expected to enhance reporting capabilities without affecting existing system performance.

---
