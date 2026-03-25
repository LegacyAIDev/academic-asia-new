-- Rename event application statuses to: Pending, Booked, Completed, Cancelled, No Show
UPDATE event_application_statuses SET code = 'pending', label = 'Pending' WHERE id = 1;
UPDATE event_application_statuses SET code = 'booked', label = 'Booked' WHERE id = 2;
UPDATE event_application_statuses SET code = 'completed', label = 'Completed' WHERE id = 3;
UPDATE event_application_statuses SET code = 'cancelled', label = 'Cancelled' WHERE id = 4;
UPDATE event_application_statuses SET code = 'no_show', label = 'No Show' WHERE id = 5;
