-- Rebrand display name casing: "CurvvTech" -> "Curvvtech" for existing seeded rows.
-- Slugs and domains remain lowercase and are untouched.

UPDATE company_settings
SET company_name = 'Curvvtech'
WHERE company_name = 'CurvvTech';

UPDATE organizations
SET name = 'Curvvtech'
WHERE name = 'CurvvTech';

UPDATE organizations
SET branding_json = jsonb_set(branding_json, '{company_name}', '"Curvvtech"')
WHERE branding_json ->> 'company_name' = 'CurvvTech';
