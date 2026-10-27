(function (root) {
  'use strict';
  const english = {
    missing_detail: 'Add at least one specific detail that helps someone choose the course, such as assignment frequency, assessment, or class format.',
    personal_attack: 'Replace the personal attack with a description of a specific teaching practice or experience.',
    private_information: 'Remove another person’s private information and keep the course experience.',
    identifiable_classmate: 'Use a description such as “a group member” and remove details that identify a classmate.',
    off_topic: 'Add information about taking this course.',
    marketing: 'Remove promotional content and keep the useful course experience.',
    exact_duplicate: 'This repeats your existing review of the same course and term. Please edit that review.',
    official_conflict: 'Check the marked fields against the official source for this course and term.'
  };
  const fields = {
    course_name: ['课程名称','Course title'], course_code: ['课程代码','Course code'], instructor: ['教师','Instructor'],
    school: ['学部','School'], studied_term: ['修读学期','Term taken'], experience: ['课程体验','Course experience'],
    workload: ['课程负担','Workload'], assessment: ['考核方式','Assessment'], group_work: ['小组合作','Group work'],
    background: ['公开修课背景','Shared background'], public_choice: ['公开展示选择','Public display choices'],
    fit: ['适合谁','Good fit for'], avoid: ['不适合谁','May not fit'], notes: ['补充说明','Additional notes'],
    teaching_language: ['授课语言','Teaching language'], content_language: ['正文语言','Review language'],
    credits: ['学分','Credits'], syllabus_url: ['官方课程链接','Official course links']
  };
  function message(item,language) {
    if (item.issue_code === 'human_review') return item.message || '';
    if (language === 'zh') return item.message || '';
    if (item.issue_code === 'off_topic' && item.range) return 'Remove the unrelated content in the marked part and keep the specific course experience.';
    return english[item.issue_code] || 'Please check this part of your review.';
  }
  function fieldLabel(name,language) {return fields[name]?.[language==='zh'?0:1] || name;}
  function status(item,language) {
    const zh=language==='zh';
    if(item.status==='pending' && item.moderation_queue==='retry_wait') return zh?'等待重试':'Waiting for retry';
    if(item.status==='pending' && item.moderation_queue==='failed') return zh?'审核暂缓':'Review paused';
    if(item.status==='pending' && item.moderation_queue==='leased') return zh?'审核中':'Reviewing';
    return '';
  }
  const api={message,fieldLabel,status};
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.SILS_REVIEW_FEEDBACK=api;
})(typeof window==='undefined'?globalThis:window);
