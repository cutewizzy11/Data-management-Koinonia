# Applied updates (requested)
- Added new applicant fields: Occupation, Former employer, Current employer, Reason why you left your former employer.
- Added new associate field: Date (associateDate).
- Moved Vet & Verify NIN actions: removed from Table tab; added to Applicants tab per-card.
- Implemented webhook call on vet to send applicant info to a Google Sheet (`VITE_VET_SHEET_WEBHOOK_URL`).
- Vetted tab: removed extra action icons; added a single Eye button that opens details like on Applicants tab.
- Person Details modal now displays the new applicant fields; Associates list shows Date.