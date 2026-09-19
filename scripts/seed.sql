-- DEVELOPMENT / DEMO DATA ONLY. This file contains no textbook-derived content.
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO courses (id, slug, title_ar, title_en, description_ar, description_en, status, sort_order)
VALUES
  (1, 'first-secondary', 'البرمجة والذكاء الاصطناعي - الصف الأول الثانوي', 'Programming & Artificial Intelligence - First Secondary', 'بيانات تجريبية للتطوير فقط وليست محتوى دراسياً معتمداً.', 'Development/demo data only; this is not authored course material.', 'published', 1),
  (2, 'second-secondary', 'البرمجة والذكاء الاصطناعي - الصف الثاني الثانوي', 'Programming & Artificial Intelligence - Second Secondary', 'بيانات تجريبية للتطوير فقط وليست محتوى دراسياً معتمداً.', 'Development/demo data only; this is not authored course material.', 'published', 2);

INSERT OR IGNORE INTO lessons (id, course_id, slug, title_ar, title_en, youtube_video_id, sort_order, status)
VALUES (1, 1, 'programming-basics-1-python', 'أساسيات البرمجة 1 - بايثون', 'Programming Basics 1 - Python', NULL, 1, 'published');

INSERT OR IGNORE INTO lesson_blocks (id, lesson_id, type, sort_order, data_json)
VALUES
  (1, 1, 'rich-text', 1, '{"ar":"هذا محتوى تجريبي للتطوير. تشرح البرمجة كيف نكتب تعليمات واضحة للحاسوب.","en":"Development demo content: programming is how we write clear instructions for a computer."}'),
  (2, 1, 'callout', 2, '{"tone":"info","ar":"ملاحظة: هذا المثال ليس محتوى منهجياً معتمداً.","en":"Note: this example is not authored curriculum content."}'),
  (3, 1, 'code', 3, '{"language":"python","code":"print(''Hello, learner!'')"}'),
  (4, 1, 'interactive', 4, '{"component":"binary-converter","props":{}}'),
  (5, 1, 'rich-text', 5, '{"ar":"ملخص: البرامج عبارة عن خطوات مرتبة، ويمكن اختبارها وتحسينها.","en":"Summary: programs are ordered steps that can be tested and improved."}');

INSERT OR IGNORE INTO questions (id, course_id, type, prompt_json, answer_json, explanation_json, difficulty, status)
VALUES
  (1, 1, 'mcq', '{"ar":"أي لغة نستخدم في هذا الدرس التجريبي؟","en":"Which language is used in this development lesson?"}', '{"choices":{"ar":["بايثون","HTML","SQL"],"en":["Python","HTML","SQL"]},"correctIndex":0}', '{"ar":"المثال البرمجي مكتوب بلغة بايثون.","en":"The example code is written in Python."}', 'beginner', 'published'),
  (2, 1, 'true_false', '{"ar":"التعليمة print تعرض نصاً على الشاشة في بايثون.","en":"The print instruction displays text in Python."}', '{"correct":true}', '{"ar":"نعم، print تعرض قيمة للمستخدم.","en":"Yes. print displays a value to the learner."}', 'beginner', 'published'),
  (3, 1, 'short_answer', '{"ar":"اكتب اسم لغة البرمجة في هذا الدرس.","en":"Type the name of the programming language in this lesson."}', '{"acceptedAnswers":["python","بايثون"]}', '{"ar":"الإجابة هي بايثون.","en":"The answer is Python."}', 'beginner', 'published'),
  (4, 1, 'true_false', '{"ar":"هذا سؤال تجريبي خاص بالمقرر كله.","en":"This is a development course-wide question."}', '{"correct":true}', '{"ar":"لا يرتبط هذا السؤال بأي درس، ولذلك يظهر عند طلب أسئلة المقرر.","en":"This question has no lesson mapping, so it is returned for course queries."}', 'beginner', 'published');

INSERT OR IGNORE INTO question_lessons (question_id, lesson_id) VALUES (1, 1), (2, 1), (3, 1);
