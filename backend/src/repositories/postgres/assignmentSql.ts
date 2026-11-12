/** Shared SELECT that loads role assignments with their position, permissions, club and section. */
export const ASSIGNMENT_SELECT = `
  SELECT ra.id, ra.student_id, ra.assigned_by, ra.assigned_on, ra.ends_on,
         p.position_id, p.name AS position_name, p.scope_type,
         (SELECT COALESCE(array_agg(pp.permission), '{}')
            FROM position_permissions pp WHERE pp.position_id = p.position_id) AS permissions,
         c.club_id, c.name AS club_name, c.description AS club_description,
         s.section_id, s.course AS section_course, s.label AS section_label, s.year AS section_year
  FROM role_assignments ra
  JOIN positions p ON p.position_id = ra.position_id
  LEFT JOIN clubs c ON c.club_id = ra.club_id
  LEFT JOIN sections s ON s.section_id = ra.section_id`;
