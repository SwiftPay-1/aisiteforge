
-- Pipeline stages table for the 4-stage AI code generation pipeline
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  description text DEFAULT '',
  stage_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  providers jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_provider text DEFAULT '',
  default_model text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pipeline stages" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read active stages" ON public.pipeline_stages
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Pipeline stage prompts table
CREATE TABLE public.pipeline_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  prompt_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pipeline prompts" ON public.pipeline_prompts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can read active pipeline prompts" ON public.pipeline_prompts
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Seed the 4 pipeline stages
INSERT INTO public.pipeline_stages (name, display_name, description, stage_order, providers, default_provider, default_model) VALUES
(
  'breakdown',
  'Breakdown',
  'Breaks down user prompts into detailed requirements, features, and technical specifications.',
  1,
  '["Google AI", "Anthropic", "Groq"]'::jsonb,
  'Google AI',
  'gemini-2.5-flash'
),
(
  'code_generation',
  'Code Generation',
  'Generates production-ready code using React, Vite, Vue, or other frameworks based on the breakdown.',
  2,
  '["Google AI", "Anthropic", "Groq"]'::jsonb,
  'Google AI',
  'gemini-2.5-pro'
),
(
  'bug_finder',
  'Bug Finder',
  'Analyzes generated code for bugs, errors, security issues, and best practice violations.',
  3,
  '["Google AI", "DeepSeek", "ChatGPT"]'::jsonb,
  'Google AI',
  'gemini-2.5-flash'
),
(
  'finalize',
  'Finalize',
  'Performs static analysis, dependency graph validation, code patching, retry logic, and final optimization.',
  4,
  '["Google AI", "Groq"]'::jsonb,
  'Google AI',
  'gemini-2.5-pro'
);

-- Seed default prompts for each stage
INSERT INTO public.pipeline_prompts (stage_id, name, description, prompt_text, is_default, sort_order) VALUES
(
  (SELECT id FROM public.pipeline_stages WHERE name = 'breakdown'),
  'Default Breakdown Prompt',
  'Standard prompt for breaking down user requirements',
  'You are an expert software architect. Analyze the user''s request and break it down into:
1. **Project Overview**: What the user wants to build
2. **Features List**: Detailed list of features with descriptions
3. **Technical Stack**: Recommended frameworks (React, Vue, Vite, etc.), libraries, and tools
4. **File Structure**: Proposed project file/folder structure
5. **Component Hierarchy**: UI components needed and their relationships
6. **Data Models**: Any data structures or state management needed
7. **API Endpoints**: If backend is needed, list the endpoints
8. **Styling Strategy**: CSS framework, theme, responsive approach

Be thorough and professional. Output as structured JSON.',
  true,
  0
),
(
  (SELECT id FROM public.pipeline_stages WHERE name = 'code_generation'),
  'Default Code Generation Prompt',
  'Standard prompt for generating production-ready code',
  'You are an expert full-stack developer. Based on the provided breakdown, generate complete, production-ready code.

Requirements:
- Write clean, modular, well-commented code
- Use modern best practices for the chosen framework (React/Vue/Vite/etc.)
- Include proper error handling and edge cases
- Implement responsive design with mobile-first approach
- Use semantic HTML5 elements
- Include CSS animations and transitions for professional feel
- Add proper TypeScript types if applicable
- Structure code for maintainability and scalability
- Include all necessary imports and dependencies
- Generate complete files - no placeholders or TODOs

Output the complete code for each file in the project.',
  true,
  0
),
(
  (SELECT id FROM public.pipeline_stages WHERE name = 'bug_finder'),
  'Default Bug Finder Prompt',
  'Standard prompt for finding bugs and issues in generated code',
  'You are an expert code reviewer and QA engineer. Analyze the provided code thoroughly for:

1. **Syntax Errors**: Any syntax issues that would prevent compilation/execution
2. **Logic Bugs**: Incorrect logic, off-by-one errors, race conditions
3. **Security Vulnerabilities**: XSS, injection, insecure data handling
4. **Performance Issues**: Memory leaks, unnecessary re-renders, N+1 queries
5. **Accessibility**: Missing ARIA labels, keyboard navigation, contrast issues
6. **Best Practice Violations**: Anti-patterns, code smells, naming conventions
7. **Missing Error Handling**: Unhandled promises, missing try-catch blocks
8. **Type Safety**: Incorrect types, missing type annotations
9. **Edge Cases**: Null/undefined handling, empty states, boundary conditions
10. **Dependency Issues**: Missing imports, version conflicts, unused dependencies

For each issue found, provide:
- File and line number
- Severity (critical/high/medium/low)
- Description of the issue
- Suggested fix with code snippet

Output as structured JSON.',
  true,
  0
),
(
  (SELECT id FROM public.pipeline_stages WHERE name = 'finalize'),
  'Default Finalize Prompt',
  'Standard prompt for final code optimization and delivery',
  'You are an expert software engineer performing final quality assurance. Given the original code and the bug report, perform:

1. **Apply Bug Fixes**: Fix all identified bugs and issues
2. **Static Analysis**: Verify code structure, imports, and exports are correct
3. **Dependency Graph**: Ensure all dependencies are properly linked and no circular dependencies exist
4. **Code Optimization**: Optimize performance-critical sections
5. **Retry Logic**: Add retry mechanisms for network calls and error-prone operations
6. **Code Patching**: Apply all necessary patches to produce final clean code
7. **Final Validation**: Ensure the complete codebase compiles and runs without errors
8. **Documentation**: Add inline comments for complex logic

Output the final, production-ready code for all files. The code should be complete and immediately usable.',
  true,
  0
);
