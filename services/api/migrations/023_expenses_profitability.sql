-- Expenses & Profitability: link expenses to projects
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_project ON expenses (project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses (category);
