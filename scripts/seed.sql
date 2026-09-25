-- DEVELOPMENT / DEMO DATA ONLY. This file contains no textbook-derived content.
-- Lesson 12-2 is an original pilot draft fixture: it has no source-review
-- evidence, certification, or real published video and therefore must not be published.
PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO courses (id, slug, title_ar, title_en, description_ar, description_en, status, sort_order)
VALUES
  (1, 'first-secondary', 'البرمجة والذكاء الاصطناعي - الصف الأول الثانوي', 'Programming & Artificial Intelligence - First Secondary', 'بيانات تجريبية للتطوير فقط وليست محتوى دراسياً معتمداً.', 'Development/demo data only; this is not authored course material.', 'published', 1),
  (2, 'second-secondary', 'البرمجة والذكاء الاصطناعي - الصف الثاني الثانوي', 'Programming & Artificial Intelligence - Second Secondary', 'بيانات تجريبية للتطوير فقط وليست محتوى دراسياً معتمداً.', 'Development/demo data only; this is not authored course material.', 'published', 2);

INSERT OR IGNORE INTO lessons (id, course_id, slug, title_ar, title_en, youtube_video_id, sort_order, status)
VALUES (1, 1, 'programming-basics-1-python', 'أساسيات البرمجة 1 - بايثون', 'Programming Basics 1 - Python', NULL, 1, 'draft');

INSERT OR IGNORE INTO lesson_blocks (id, lesson_id, type, sort_order, data_json)
VALUES
  (1, 1, 'rich-text', 1, '{"ar":"مسودة تجريبية أصلية: في هذا الدرس نبني برنامجاً قصيراً من تعليمات مرتبة. سنستخدم output لعرض نتيجة، ومتغيرات لحفظ قيم، وإسناداً لتحديث قيمة.","en":"Original pilot draft: in this lesson we build a short program from ordered instructions. We use output to show a result, variables to store values, and assignment to update a value."}'),
  (2, 1, 'rich-text', 2, '{"ar":"يسير البرنامج بالتتابع: ينفذ الحاسوب التعليمة الأولى ثم التالية. يمكن أن تجمع العملية الحسابية أعداداً أو تطرحها أو تضربها أو تقسمها، ثم نعرض النتيجة.","en":"A program runs in sequence: the computer performs the first instruction and then the next one. An arithmetic operation can add, subtract, multiply, or divide numbers, and then we display the result."}'),
  (3, 1, 'code', 3, '{"language":"python","code":"student_name = \\"Mariam\\"\nprint(student_name)"}'),
  (4, 1, 'code', 4, '{"language":"python","code":"books = 3\nbooks = books + 2\nprint(books)"}'),
  (5, 1, 'image', 5, '{"src":"/diagrams/python-sequence.svg","alt":{"ar":"رسم أصلي يوضح ثلاث مراحل مرقمة: حفظ قيمة ثم إجراء حساب ثم عرض الناتج.","en":"Original diagram showing three numbered stages: store a value, calculate, then show the output."},"caption":{"ar":"تسلسل بسيط لتنفيذ برنامج قصير.","en":"A simple sequence for running a short program."}}'),
  (6, 1, 'callout', 6, '{"tone":"key-concept","ar":"ملخص المسودة: اكتب تعليمات واضحة بالترتيب، اختر اسماً ذا معنى للمتغير، وراجع الناتج بعد كل تغيير.","en":"Draft recap: write clear instructions in order, choose a meaningful variable name, and check the output after each change."}');

INSERT OR IGNORE INTO questions (id, course_id, type, prompt_json, answer_json, explanation_json, difficulty, status)
VALUES
  (1, 1, 'mcq', '{"ar":"ما التعليمة التي تعرض قيمة للمستخدم في المثال؟","en":"Which instruction shows a value to the learner in the example?"}', '{"choices":{"ar":["print","input","import"],"en":["print","input","import"]},"correctIndex":0}', '{"ar":"تستخدم print لعرض قيمة أو نص في المخرجات.","en":"print displays a value or text in the output."}', 'easy', 'published'),
  (2, 1, 'true_false', '{"ar":"بعد تنفيذ books = books + 2 تصبح قيمة books أكبر بمقدار 2.","en":"After books = books + 2 runs, the value of books is larger by 2."}', '{"correct":true}', '{"ar":"يحسب الجانب الأيمن أولاً ثم يسند الناتج إلى المتغير books.","en":"Python evaluates the right side first and then assigns the result to books."}', 'medium', 'published'),
  (3, 1, 'short_answer', '{"ar":"إذا كانت points تساوي 8، اكتب التعبير الذي يزيدها بمقدار 4 باستخدام الإسناد.","en":"If points is 8, type the assignment statement that increases it by 4."}', '{"acceptedAnswers":["points = points + 4","points=points+4"]}', '{"ar":"يستخدم التعبير القيمة الحالية ثم يسند الناتج الجديد إلى المتغير نفسه.","en":"The statement uses the current value and assigns the new result back to the same variable."}', 'hard', 'published'),
  (4, 1, 'true_false', '{"ar":"هذا سؤال تجريبي خاص بالمقرر كله.","en":"This is a development course-wide question."}', '{"correct":true}', '{"ar":"لا يرتبط هذا السؤال بأي درس، ولذلك يظهر عند طلب أسئلة المقرر.","en":"This question has no lesson mapping, so it is returned for course queries."}', 'easy', 'published');

INSERT OR IGNORE INTO question_lessons (question_id, lesson_id) VALUES (1, 1), (2, 1), (3, 1);
