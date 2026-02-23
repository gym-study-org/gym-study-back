-- Migration 016: Seed Skill Categories and Assessment Questions

-- ============================================
-- SKILL CATEGORIES
-- ============================================

INSERT INTO skill_categories (code, name, description, icon, sort_order) VALUES
  ('javascript', 'JavaScript', 'Core JavaScript fundamentals and ES6+ features', 'SiJavascript', 1),
  ('typescript', 'TypeScript', 'TypeScript type system, generics, and advanced types', 'SiTypescript', 2),
  ('react', 'React', 'React components, hooks, state management and patterns', 'SiReact', 3),
  ('nodejs', 'Node.js', 'Node.js runtime, APIs, and server-side development', 'SiNodedotjs', 4),
  ('python', 'Python', 'Python programming, data structures and Pythonic patterns', 'SiPython', 5),
  ('sql', 'SQL', 'SQL queries, joins, indexing and database design', 'Database', 6),
  ('system_design', 'System Design', 'Architecture patterns, scalability and distributed systems', 'Server', 7),
  ('git', 'Git', 'Version control, branching strategies and collaboration', 'SiGit', 8),
  ('docker', 'Docker', 'Containerization, Docker Compose and orchestration', 'SiDocker', 9),
  ('algorithms', 'Algorithms & Data Structures', 'Common algorithms, complexity analysis and data structures', 'Brain', 10)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- JAVASCRIPT QUESTIONS (15 questions)
-- ============================================

INSERT INTO assessment_questions (skill_category_id, question, question_type, difficulty, options, correct_answer, explanation, time_limit_seconds)
SELECT sc.id,
  q.question, q.question_type, q.difficulty,
  q.options::jsonb, q.correct_answer, q.explanation, q.time_limit
FROM skill_categories sc,
(VALUES
  ('What is the output of: typeof null?',
   'multiple_choice', 'beginner',
   '[{"text": "\"null\""}, {"text": "\"undefined\""}, {"text": "\"object\""}, {"text": "\"boolean\""}]',
   2, 'typeof null returns "object" due to a historical bug in JavaScript.', 30),

  ('What does Array.prototype.reduce() do?',
   'multiple_choice', 'beginner',
   '[{"text": "Filters elements from an array"}, {"text": "Transforms each element"}, {"text": "Accumulates array elements into a single value"}, {"text": "Sorts the array"}]',
   2, 'reduce() executes a reducer function on each element, resulting in a single output value.', 30),

  ('What is the output of: console.log(0.1 + 0.2 === 0.3)?',
   'true_false', 'intermediate',
   '[{"text": "true"}, {"text": "false"}]',
   1, '0.1 + 0.2 equals 0.30000000000000004 in IEEE 754 floating-point arithmetic.', 30),

  ('What is a closure in JavaScript?',
   'multiple_choice', 'intermediate',
   '[{"text": "A way to close a browser window"}, {"text": "A function that has access to variables in its outer scope"}, {"text": "A method to seal an object"}, {"text": "A type of loop"}]',
   1, 'A closure is a function bundled together with its lexical environment.', 45),

  ('What is the output of: [1,2,3].map(parseInt)?',
   'code_output', 'advanced',
   '[{"text": "[1, 2, 3]"}, {"text": "[1, NaN, NaN]"}, {"text": "[1, NaN, 1]"}, {"text": "Error"}]',
   1, 'parseInt receives (value, index) from map. parseInt(1,0)=1, parseInt(2,1)=NaN, parseInt(3,2)=NaN.', 60),

  ('Which statement about "let" vs "var" is correct?',
   'multiple_choice', 'beginner',
   '[{"text": "let is function-scoped, var is block-scoped"}, {"text": "let is block-scoped, var is function-scoped"}, {"text": "Both are block-scoped"}, {"text": "Both are function-scoped"}]',
   1, 'let and const are block-scoped, while var is function-scoped.', 30),

  ('What does the "..." spread operator do in: const b = {...a}?',
   'multiple_choice', 'intermediate',
   '[{"text": "Creates a deep copy of a"}, {"text": "Creates a shallow copy of a"}, {"text": "Creates a reference to a"}, {"text": "Throws an error"}]',
   1, 'The spread operator creates a shallow copy - nested objects still share references.', 45),

  ('What is the output of: Promise.resolve(1).then(x => x + 1).then(x => { throw x }).catch(x => x + 1).then(x => console.log(x))?',
   'code_output', 'advanced',
   '[{"text": "1"}, {"text": "2"}, {"text": "3"}, {"text": "Error"}]',
   2, 'resolve(1) -> then(2) -> catch receives 2, returns 3 -> then logs 3.', 90),

  ('What is event delegation?',
   'multiple_choice', 'intermediate',
   '[{"text": "Assigning events to multiple elements"}, {"text": "Using a parent element to handle events for child elements"}, {"text": "Preventing event propagation"}, {"text": "Creating custom events"}]',
   1, 'Event delegation leverages event bubbling to handle events at a parent level instead of individual children.', 45),

  ('What is the temporal dead zone (TDZ)?',
   'multiple_choice', 'advanced',
   '[{"text": "A zone where setTimeout does not work"}, {"text": "The period between scope entry and variable declaration for let/const"}, {"text": "A memory leak pattern"}, {"text": "An area where async code cannot execute"}]',
   1, 'The TDZ is the period from scope entry until a let/const variable is declared - accessing it throws ReferenceError.', 60),

  ('Which method creates a new array with elements that pass a test?',
   'multiple_choice', 'beginner',
   '[{"text": "map()"}, {"text": "filter()"}, {"text": "reduce()"}, {"text": "find()"}]',
   1, 'filter() creates a new array with all elements that pass the test implemented by the provided function.', 30),

  ('What is the output of: typeof NaN?',
   'multiple_choice', 'intermediate',
   '[{"text": "\"NaN\""}, {"text": "\"undefined\""}, {"text": "\"number\""}, {"text": "\"object\""}]',
   2, 'NaN is technically a numeric value in JavaScript, so typeof NaN returns "number".', 30),

  ('What is the difference between == and ===?',
   'multiple_choice', 'beginner',
   '[{"text": "No difference"}, {"text": "== checks value only, === checks value and type"}, {"text": "=== checks value only, == checks value and type"}, {"text": "== is faster than ==="}]',
   1, '== performs type coercion before comparison, while === compares both value and type without coercion.', 30),

  ('What does Object.freeze() do?',
   'multiple_choice', 'intermediate',
   '[{"text": "Deep freezes an object and all nested objects"}, {"text": "Makes an object immutable at the top level"}, {"text": "Converts an object to a string"}, {"text": "Prevents garbage collection of an object"}]',
   1, 'Object.freeze() makes top-level properties immutable but does NOT deep-freeze nested objects.', 45),

  ('What is the output of: async function f() { return 1; } f().then(console.log)?',
   'code_output', 'intermediate',
   '[{"text": "1"}, {"text": "Promise {1}"}, {"text": "undefined"}, {"text": "Error"}]',
   0, 'An async function always returns a Promise. The resolved value 1 is passed to .then().', 45)

) AS q(question, question_type, difficulty, options, correct_answer, explanation, time_limit)
WHERE sc.code = 'javascript';

-- ============================================
-- TYPESCRIPT QUESTIONS (12 questions)
-- ============================================

INSERT INTO assessment_questions (skill_category_id, question, question_type, difficulty, options, correct_answer, explanation, time_limit_seconds)
SELECT sc.id,
  q.question, q.question_type, q.difficulty,
  q.options::jsonb, q.correct_answer, q.explanation, q.time_limit
FROM skill_categories sc,
(VALUES
  ('What is the "unknown" type in TypeScript?',
   'multiple_choice', 'intermediate',
   '[{"text": "Same as any"}, {"text": "A type-safe counterpart of any"}, {"text": "A type for undefined values"}, {"text": "A type for null values"}]',
   1, 'unknown is the type-safe counterpart of any. You must narrow the type before using the value.', 45),

  ('What is a discriminated union in TypeScript?',
   'multiple_choice', 'advanced',
   '[{"text": "A union that uses a shared literal property to distinguish between members"}, {"text": "A union of classes"}, {"text": "A union that cannot be assigned"}, {"text": "A union of enums"}]',
   0, 'Discriminated unions use a common property with literal types (the discriminant) to narrow types.', 60),

  ('What is the difference between "interface" and "type" in TypeScript?',
   'multiple_choice', 'intermediate',
   '[{"text": "No difference"}, {"text": "Interfaces can be extended and merged, types use intersections and support unions"}, {"text": "Types are faster"}, {"text": "Interfaces support unions, types do not"}]',
   1, 'Interfaces support declaration merging and extends. Types support unions, intersections, and mapped types.', 45),

  ('What does "keyof" do?',
   'multiple_choice', 'intermediate',
   '[{"text": "Creates a new key"}, {"text": "Returns a union of all property names of a type"}, {"text": "Checks if a key exists"}, {"text": "Deletes a key from an object"}]',
   1, 'keyof T produces a union type of all known public property names of T.', 45),

  ('What is a generic constraint in TypeScript? (e.g., T extends SomeType)',
   'multiple_choice', 'advanced',
   '[{"text": "It restricts the class hierarchy"}, {"text": "It limits what types can be used as a type parameter"}, {"text": "It creates a new type"}, {"text": "It prevents type inference"}]',
   1, 'Generic constraints limit the types that can be substituted for a type parameter.', 60),

  ('What is "as const" used for?',
   'multiple_choice', 'intermediate',
   '[{"text": "Casting to a constant type"}, {"text": "Making values deeply readonly and narrowing literal types"}, {"text": "Creating a constant variable"}, {"text": "Freezing an object at runtime"}]',
   1, '"as const" asserts the expression as a deeply readonly literal type, narrowing types to their literal values.', 45),

  ('What is the "never" type used for?',
   'multiple_choice', 'advanced',
   '[{"text": "Functions that never return and exhaustive checks"}, {"text": "Variables that are never used"}, {"text": "Optional parameters"}, {"text": "Async functions"}]',
   0, 'never represents values that never occur - unreachable code, functions that throw, and exhaustiveness checks.', 60),

  ('What is a mapped type?',
   'multiple_choice', 'advanced',
   '[{"text": "A type created from a Map object"}, {"text": "A type that transforms properties of an existing type"}, {"text": "A type for geographic maps"}, {"text": "A type that maps functions to values"}]',
   1, 'Mapped types create new types by transforming each property of an existing type (e.g., Partial<T>, Readonly<T>).', 60),

  ('What does Partial<T> do?',
   'multiple_choice', 'beginner',
   '[{"text": "Makes all properties of T required"}, {"text": "Makes all properties of T optional"}, {"text": "Removes all properties from T"}, {"text": "Makes T readonly"}]',
   1, 'Partial<T> makes all properties of T optional by adding ? to each property.', 30),

  ('What is a type guard?',
   'multiple_choice', 'intermediate',
   '[{"text": "A runtime check that narrows the type within a conditional block"}, {"text": "A security feature"}, {"text": "A compile-time-only check"}, {"text": "A design pattern for error handling"}]',
   0, 'Type guards are runtime expressions that narrow types in conditional branches (typeof, instanceof, custom predicates).', 45),

  ('What does the "infer" keyword do in conditional types?',
   'multiple_choice', 'expert',
   '[{"text": "Automatically infers function return types"}, {"text": "Declares a type variable within a conditional type to be inferred"}, {"text": "Infers generic arguments"}, {"text": "Creates type aliases automatically"}]',
   1, 'infer declares a type variable in a conditional type that TypeScript infers from the matched pattern.', 90),

  ('Which utility type extracts the return type of a function?',
   'multiple_choice', 'intermediate',
   '[{"text": "Parameters<T>"}, {"text": "ReturnType<T>"}, {"text": "InstanceType<T>"}, {"text": "ThisType<T>"}]',
   1, 'ReturnType<T> constructs a type consisting of the return type of function T.', 30)

) AS q(question, question_type, difficulty, options, correct_answer, explanation, time_limit)
WHERE sc.code = 'typescript';

-- ============================================
-- REACT QUESTIONS (12 questions)
-- ============================================

INSERT INTO assessment_questions (skill_category_id, question, question_type, difficulty, options, correct_answer, explanation, time_limit_seconds)
SELECT sc.id,
  q.question, q.question_type, q.difficulty,
  q.options::jsonb, q.correct_answer, q.explanation, q.time_limit
FROM skill_categories sc,
(VALUES
  ('What is the purpose of useEffect?',
   'multiple_choice', 'beginner',
   '[{"text": "To manage state"}, {"text": "To perform side effects in function components"}, {"text": "To create context"}, {"text": "To memoize values"}]',
   1, 'useEffect lets you perform side effects like data fetching, subscriptions, and DOM manipulation.', 30),

  ('When does React re-render a component?',
   'multiple_choice', 'intermediate',
   '[{"text": "Only when props change"}, {"text": "When state or props change, or when the parent re-renders"}, {"text": "Only when state changes"}, {"text": "Every second automatically"}]',
   1, 'A component re-renders when its state changes, its props change, or its parent component re-renders.', 45),

  ('What is the difference between useMemo and useCallback?',
   'multiple_choice', 'intermediate',
   '[{"text": "No difference"}, {"text": "useMemo memoizes a computed value, useCallback memoizes a function"}, {"text": "useMemo is for async, useCallback is for sync"}, {"text": "useCallback memoizes a value, useMemo memoizes a function"}]',
   1, 'useMemo returns a memoized value, useCallback returns a memoized function reference.', 45),

  ('What is a controlled component?',
   'multiple_choice', 'beginner',
   '[{"text": "A component that controls other components"}, {"text": "A form element whose value is controlled by React state"}, {"text": "A component with access control"}, {"text": "A component inside a controller"}]',
   1, 'A controlled component has its form element value driven by React state via value prop and onChange handler.', 30),

  ('What is React.memo() used for?',
   'multiple_choice', 'intermediate',
   '[{"text": "To create memos in the app"}, {"text": "To prevent unnecessary re-renders by memoizing the component"}, {"text": "To store data in memory"}, {"text": "To create static components"}]',
   1, 'React.memo() is a HOC that memoizes a component, skipping re-renders if props have not changed.', 45),

  ('What is the rules of hooks?',
   'multiple_choice', 'intermediate',
   '[{"text": "Hooks can be called anywhere"}, {"text": "Only call hooks at the top level and only from React functions"}, {"text": "Hooks must be called inside loops"}, {"text": "Hooks can only be called in class components"}]',
   1, 'Hooks must be called at the top level (not in loops/conditions) and only from function components or custom hooks.', 45),

  ('What problem does useRef solve?',
   'multiple_choice', 'intermediate',
   '[{"text": "State management"}, {"text": "Persisting a mutable value across renders without causing re-renders"}, {"text": "Routing"}, {"text": "API calls"}]',
   1, 'useRef returns a mutable ref object whose .current property persists across renders without triggering re-renders.', 45),

  ('What is the virtual DOM?',
   'multiple_choice', 'beginner',
   '[{"text": "A separate browser DOM"}, {"text": "A lightweight JavaScript representation of the real DOM for efficient updates"}, {"text": "A DOM for virtual reality"}, {"text": "A server-side DOM"}]',
   1, 'The virtual DOM is an in-memory representation that React uses to diff changes before updating the real DOM.', 30),

  ('What is prop drilling and how to avoid it?',
   'multiple_choice', 'intermediate',
   '[{"text": "Passing props through many levels; avoid with Context API or state management"}, {"text": "Drilling into prop values; use destructuring"}, {"text": "A performance optimization technique"}, {"text": "A testing pattern"}]',
   0, 'Prop drilling is passing data through many component levels. Solutions: Context API, Redux, Zustand, etc.', 45),

  ('What is the key prop used for in lists?',
   'multiple_choice', 'beginner',
   '[{"text": "Styling list items"}, {"text": "Helping React identify which items changed, were added, or removed"}, {"text": "Sorting the list"}, {"text": "Filtering the list"}]',
   1, 'Keys help React identify elements in lists, enabling efficient reconciliation when items change.', 30),

  ('What is a custom hook?',
   'multiple_choice', 'intermediate',
   '[{"text": "A hook from a library"}, {"text": "A function starting with use that encapsulates reusable stateful logic"}, {"text": "A class method"}, {"text": "A built-in React hook"}]',
   1, 'A custom hook is a function prefixed with "use" that composes built-in hooks to extract reusable stateful logic.', 45),

  ('What happens when you call setState with the same value?',
   'multiple_choice', 'advanced',
   '[{"text": "Always re-renders"}, {"text": "React bails out of the re-render (may still render the component but skips children)"}, {"text": "Throws an error"}, {"text": "Resets the component"}]',
   1, 'React may bail out of rendering if the new state is identical (Object.is comparison), but the component itself may still render once.', 60)

) AS q(question, question_type, difficulty, options, correct_answer, explanation, time_limit)
WHERE sc.code = 'react';

-- ============================================
-- NODE.JS QUESTIONS (12 questions)
-- ============================================

INSERT INTO assessment_questions (skill_category_id, question, question_type, difficulty, options, correct_answer, explanation, time_limit_seconds)
SELECT sc.id,
  q.question, q.question_type, q.difficulty,
  q.options::jsonb, q.correct_answer, q.explanation, q.time_limit
FROM skill_categories sc,
(VALUES
  ('What is the event loop in Node.js?',
   'multiple_choice', 'intermediate',
   '[{"text": "A loop that listens for DOM events"}, {"text": "A mechanism that handles async operations by offloading to the system and polling for completion"}, {"text": "A for loop for events"}, {"text": "A threading mechanism"}]',
   1, 'The event loop is the core mechanism that allows Node.js to perform non-blocking I/O by offloading operations to the system kernel.', 45),

  ('What is the difference between process.nextTick() and setImmediate()?',
   'multiple_choice', 'advanced',
   '[{"text": "No difference"}, {"text": "nextTick fires before I/O callbacks, setImmediate fires after"}, {"text": "setImmediate fires before nextTick"}, {"text": "nextTick is deprecated"}]',
   1, 'process.nextTick() fires at the end of current operation before any I/O. setImmediate() executes in the next iteration of the event loop.', 60),

  ('What is middleware in Express.js?',
   'multiple_choice', 'beginner',
   '[{"text": "Software between the OS and application"}, {"text": "Functions that have access to req, res, and next in the request-response cycle"}, {"text": "A database layer"}, {"text": "A front-end framework"}]',
   1, 'Express middleware are functions with access to request, response, and the next middleware function.', 30),

  ('What is the purpose of package-lock.json?',
   'multiple_choice', 'beginner',
   '[{"text": "To lock the package.json from editing"}, {"text": "To ensure exact dependency versions are installed across all environments"}, {"text": "To encrypt packages"}, {"text": "To list dev dependencies only"}]',
   1, 'package-lock.json locks exact dependency versions for deterministic installs across environments.', 30),

  ('What are streams in Node.js?',
   'multiple_choice', 'intermediate',
   '[{"text": "Video streaming APIs"}, {"text": "Objects for reading/writing data piece by piece without loading everything into memory"}, {"text": "HTTP connections"}, {"text": "WebSocket connections"}]',
   1, 'Streams are objects that let you read/write data continuously, processing chunks without loading the entire data into memory.', 45),

  ('What is the cluster module used for?',
   'multiple_choice', 'advanced',
   '[{"text": "Database clustering"}, {"text": "Creating child processes that share the same server port for load balancing"}, {"text": "File system clustering"}, {"text": "Memory clustering"}]',
   1, 'The cluster module allows creating child processes (workers) that share the same server port, enabling multi-core utilization.', 60),

  ('What does Buffer represent in Node.js?',
   'multiple_choice', 'intermediate',
   '[{"text": "A temporary UI element"}, {"text": "A region of memory for storing raw binary data"}, {"text": "A caching mechanism"}, {"text": "A queue for HTTP requests"}]',
   1, 'Buffer is a class for handling raw binary data directly in memory, useful for streams and file I/O.', 45),

  ('What is the purpose of the "path" module?',
   'multiple_choice', 'beginner',
   '[{"text": "To create file paths"}, {"text": "To work with file and directory paths in a cross-platform way"}, {"text": "To route HTTP requests"}, {"text": "To manage URL paths"}]',
   1, 'The path module provides utilities for working with file/directory paths, handling OS-specific separators.', 30),

  ('What is "callback hell" and how to avoid it?',
   'multiple_choice', 'intermediate',
   '[{"text": "A bug in callbacks; use try-catch"}, {"text": "Deeply nested callbacks; use Promises or async/await"}, {"text": "Slow callbacks; use caching"}, {"text": "Infinite loop in callbacks; use break"}]',
   1, 'Callback hell is deeply nested callbacks that are hard to read. Solutions: Promises, async/await, or modularization.', 45),

  ('What does the "fs" module createReadStream do vs readFile?',
   'multiple_choice', 'intermediate',
   '[{"text": "Both do the same thing"}, {"text": "createReadStream reads data in chunks (streaming), readFile loads the entire file into memory"}, {"text": "readFile is async, createReadStream is sync"}, {"text": "createReadStream is deprecated"}]',
   1, 'createReadStream processes data in chunks without loading the entire file, ideal for large files.', 45),

  ('What is the purpose of environment variables in Node.js?',
   'multiple_choice', 'beginner',
   '[{"text": "To set JavaScript variables"}, {"text": "To store configuration outside code, enabling different settings per environment"}, {"text": "To create global variables"}, {"text": "To define CSS variables"}]',
   1, 'Environment variables store configuration externally, keeping secrets out of code and enabling per-environment settings.', 30),

  ('What is graceful shutdown in a Node.js server?',
   'multiple_choice', 'advanced',
   '[{"text": "Calling process.exit(0) immediately"}, {"text": "Finishing ongoing requests, closing connections, then exiting cleanly"}, {"text": "Restarting the server"}, {"text": "Logging an error before crashing"}]',
   1, 'Graceful shutdown means stopping new connections, finishing in-progress requests, closing DB/cache connections, then exiting.', 60)

) AS q(question, question_type, difficulty, options, correct_answer, explanation, time_limit)
WHERE sc.code = 'nodejs';

-- ============================================
-- SQL QUESTIONS (12 questions)
-- ============================================

INSERT INTO assessment_questions (skill_category_id, question, question_type, difficulty, options, correct_answer, explanation, time_limit_seconds)
SELECT sc.id,
  q.question, q.question_type, q.difficulty,
  q.options::jsonb, q.correct_answer, q.explanation, q.time_limit
FROM skill_categories sc,
(VALUES
  ('What is the difference between INNER JOIN and LEFT JOIN?',
   'multiple_choice', 'beginner',
   '[{"text": "No difference"}, {"text": "INNER JOIN returns only matching rows, LEFT JOIN includes all left table rows"}, {"text": "LEFT JOIN is faster"}, {"text": "INNER JOIN returns all rows from both tables"}]',
   1, 'INNER JOIN returns only rows with matches in both tables. LEFT JOIN returns all rows from the left table, NULLs for non-matches.', 30),

  ('What is a composite index?',
   'multiple_choice', 'intermediate',
   '[{"text": "An index on a computed column"}, {"text": "An index on multiple columns"}, {"text": "An index that combines B-tree and hash"}, {"text": "An index on a JSON column"}]',
   1, 'A composite index is an index on two or more columns, useful for queries filtering on those columns together.', 45),

  ('What does EXPLAIN ANALYZE do?',
   'multiple_choice', 'intermediate',
   '[{"text": "Explains the SQL syntax"}, {"text": "Shows the query execution plan with actual timing and row counts"}, {"text": "Analyzes table statistics"}, {"text": "Optimizes the query automatically"}]',
   1, 'EXPLAIN ANALYZE executes the query and shows the actual execution plan with real timing and row counts.', 45),

  ('What is a CTE (Common Table Expression)?',
   'multiple_choice', 'intermediate',
   '[{"text": "A temporary table"}, {"text": "A named temporary result set defined with WITH, scoped to a single statement"}, {"text": "A stored procedure"}, {"text": "A materialized view"}]',
   1, 'A CTE is a named temporary result set defined with WITH that exists only within the scope of a single SQL statement.', 45),

  ('What is the difference between WHERE and HAVING?',
   'multiple_choice', 'beginner',
   '[{"text": "No difference"}, {"text": "WHERE filters rows before grouping, HAVING filters groups after aggregation"}, {"text": "HAVING filters rows, WHERE filters groups"}, {"text": "WHERE is faster than HAVING"}]',
   1, 'WHERE filters individual rows before GROUP BY. HAVING filters aggregated groups after GROUP BY.', 30),

  ('What is a window function?',
   'multiple_choice', 'advanced',
   '[{"text": "A function that opens a new database window"}, {"text": "A function that performs calculations across a set of rows related to the current row"}, {"text": "A function for windowed queries"}, {"text": "A function that creates partitions"}]',
   1, 'Window functions perform calculations across a set of table rows related to the current row, using OVER().', 60),

  ('What is database normalization?',
   'multiple_choice', 'beginner',
   '[{"text": "Making all data lowercase"}, {"text": "Organizing data to reduce redundancy and improve data integrity"}, {"text": "Compressing the database"}, {"text": "Converting data types"}]',
   1, 'Normalization organizes data into tables to reduce redundancy and dependency, improving integrity.', 30),

  ('What is a deadlock?',
   'multiple_choice', 'advanced',
   '[{"text": "A crashed database"}, {"text": "When two or more transactions block each other by holding locks the other needs"}, {"text": "A locked table"}, {"text": "A timeout error"}]',
   1, 'A deadlock occurs when two+ transactions each hold a lock the other needs, creating a circular dependency.', 60),

  ('What does COALESCE do?',
   'multiple_choice', 'beginner',
   '[{"text": "Combines two tables"}, {"text": "Returns the first non-NULL value from a list of arguments"}, {"text": "Converts data types"}, {"text": "Groups rows together"}]',
   1, 'COALESCE returns the first non-NULL argument, useful for providing default values.', 30),

  ('What is the difference between DELETE and TRUNCATE?',
   'multiple_choice', 'intermediate',
   '[{"text": "No difference"}, {"text": "DELETE is row-by-row and logged, TRUNCATE removes all rows quickly and resets identity"}, {"text": "TRUNCATE deletes specific rows"}, {"text": "DELETE is faster than TRUNCATE"}]',
   1, 'DELETE removes rows individually (can have WHERE), is logged. TRUNCATE removes all rows at once, resets identity, is faster.', 45),

  ('What is an execution plan?',
   'multiple_choice', 'intermediate',
   '[{"text": "A project plan"}, {"text": "The database optimizer strategy for how to execute a query"}, {"text": "A list of SQL commands"}, {"text": "A backup plan"}]',
   1, 'An execution plan shows how the database optimizer decides to execute a query - which indexes, joins, and scans to use.', 45),

  ('What are ACID properties?',
   'multiple_choice', 'intermediate',
   '[{"text": "Authentication, Confidentiality, Integrity, Durability"}, {"text": "Atomicity, Consistency, Isolation, Durability"}, {"text": "Availability, Consistency, Integrity, Durability"}, {"text": "Atomicity, Concurrency, Isolation, Dependability"}]',
   1, 'ACID: Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent transactions), Durability (committed = permanent).', 45)

) AS q(question, question_type, difficulty, options, correct_answer, explanation, time_limit)
WHERE sc.code = 'sql';

-- ============================================
-- PYTHON QUESTIONS (10 questions)
-- ============================================

INSERT INTO assessment_questions (skill_category_id, question, question_type, difficulty, options, correct_answer, explanation, time_limit_seconds)
SELECT sc.id,
  q.question, q.question_type, q.difficulty,
  q.options::jsonb, q.correct_answer, q.explanation, q.time_limit
FROM skill_categories sc,
(VALUES
  ('What is the difference between a list and a tuple in Python?',
   'multiple_choice', 'beginner',
   '[{"text": "No difference"}, {"text": "Lists are mutable, tuples are immutable"}, {"text": "Tuples are mutable, lists are immutable"}, {"text": "Lists can only hold strings"}]',
   1, 'Lists are mutable (can be modified after creation), tuples are immutable.', 30),

  ('What is a list comprehension?',
   'multiple_choice', 'beginner',
   '[{"text": "A way to understand lists"}, {"text": "A concise way to create lists using a single line of code"}, {"text": "A list sorting method"}, {"text": "A list merging technique"}]',
   1, 'List comprehensions provide a concise way to create lists: [expr for item in iterable if condition].', 30),

  ('What is the GIL (Global Interpreter Lock)?',
   'multiple_choice', 'advanced',
   '[{"text": "A security feature"}, {"text": "A mutex that prevents multiple threads from executing Python bytecode simultaneously"}, {"text": "A garbage collector"}, {"text": "A module loader"}]',
   1, 'The GIL is a mutex in CPython that allows only one thread to execute Python bytecode at a time, limiting true parallelism.', 60),

  ('What is a decorator in Python?',
   'multiple_choice', 'intermediate',
   '[{"text": "A design pattern for UI"}, {"text": "A function that wraps another function to extend its behavior"}, {"text": "A class method"}, {"text": "A type annotation"}]',
   1, 'Decorators are functions that modify the behavior of other functions/methods, applied with the @decorator syntax.', 45),

  ('What does *args and **kwargs mean?',
   'multiple_choice', 'intermediate',
   '[{"text": "Pointers"}, {"text": "*args collects positional args as tuple, **kwargs collects keyword args as dict"}, {"text": "Multiplication operators"}, {"text": "Error handlers"}]',
   1, '*args collects extra positional arguments into a tuple, **kwargs collects extra keyword arguments into a dictionary.', 45),

  ('What is a generator in Python?',
   'multiple_choice', 'intermediate',
   '[{"text": "A code generator tool"}, {"text": "A function that yields values lazily using the yield keyword"}, {"text": "A class constructor"}, {"text": "A random number generator"}]',
   1, 'Generators are functions that use yield to produce a sequence of values lazily, one at a time.', 45),

  ('What is the difference between deepcopy and copy?',
   'multiple_choice', 'intermediate',
   '[{"text": "No difference"}, {"text": "copy creates a shallow copy, deepcopy creates a copy of all nested objects too"}, {"text": "deepcopy is slower but identical in result"}, {"text": "copy works on files, deepcopy on objects"}]',
   1, 'copy.copy() creates a shallow copy (references nested objects), copy.deepcopy() recursively copies all nested objects.', 45),

  ('What is a context manager (with statement)?',
   'multiple_choice', 'intermediate',
   '[{"text": "A state management tool"}, {"text": "An object that manages resource setup/teardown via __enter__/__exit__"}, {"text": "A debugging tool"}, {"text": "A threading utility"}]',
   1, 'Context managers handle resource setup and cleanup via __enter__/__exit__ methods, commonly used with the "with" statement.', 45),

  ('What is duck typing?',
   'multiple_choice', 'intermediate',
   '[{"text": "A type of testing"}, {"text": "If it walks and quacks like a duck, it is a duck - type determined by methods/properties, not class"}, {"text": "A naming convention"}, {"text": "A type casting method"}]',
   1, 'Duck typing means an object type is determined by its methods and properties, not its class - focusing on behavior over identity.', 45),

  ('What is the output of: print([1,2,3][::-1])?',
   'code_output', 'beginner',
   '[{"text": "[3, 2, 1]"}, {"text": "[1, 2, 3]"}, {"text": "Error"}, {"text": "[1, 3]"}]',
   0, '[::-1] is slice notation that reverses the list. Step of -1 means go backwards.', 30)

) AS q(question, question_type, difficulty, options, correct_answer, explanation, time_limit)
WHERE sc.code = 'python';
