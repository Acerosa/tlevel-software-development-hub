drop index if exists learning.enrolments_one_active_per_student;

create unique index enrolments_one_active_per_student_group
on learning.enrolments (student_id, group_id)
where status = 'active';
