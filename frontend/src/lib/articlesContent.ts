// Static, hand-written psychoeducation content -- same rationale as
// exercisesContent.ts: no model in the loop, so nothing here can be
// hallucinated or drift between users. General information, not a
// diagnosis or treatment plan for any individual.

export interface Article {
  id: string;
  category: "Anxiety" | "Mood" | "How Sol works" | "Eco-anxiety";
  title: string;
  summary: string;
  body: string[];
}

export const ARTICLES: Article[] = [
  {
    id: "what-is-anxiety",
    category: "Anxiety",
    title: "What is anxiety, actually?",
    summary: "The nervous system's alarm, and why it can misfire.",
    body: [
      "Anxiety is your body's alarm system -- a set of physical and mental changes (faster heartbeat, tense muscles, racing thoughts) meant to prepare you for a threat.",
      "The system evolved for physical danger, but it responds the same way to non-physical threats: a deadline, an argument, an uncertain future. The alarm can be real even when there's no danger to run from.",
      "Occasional anxiety is a normal, useful signal. It becomes a problem when it fires too often, too intensely, or in situations that don't call for it -- and starts interfering with daily life.",
      "Anxiety is highly treatable. Therapy (especially CBT), lifestyle changes, and sometimes medication all have strong evidence behind them. Noticing the pattern is the first step, not the whole solution.",
    ],
  },
  {
    id: "what-is-cbt",
    category: "How Sol works",
    title: "How CBT thinking works",
    summary: "Thoughts, feelings, and behavior all feed each other.",
    body: [
      "Cognitive Behavioral Therapy (CBT) is built on a simple idea: thoughts, feelings, and behaviors constantly influence each other. Change one, and the others tend to shift too.",
      "A thought like \"I'm going to fail this\" produces a feeling (dread), which produces a behavior (avoiding the task) -- which then reinforces the original thought (\"see, I couldn't even try\").",
      "CBT doesn't ask you to force positive thinking. It asks you to treat thoughts as things to examine, not facts to accept automatically -- checking them against actual evidence.",
      "The 'thought record' and 'thinking traps' exercises in the Guided Exercises tab are direct, practical applications of this -- a structured way to do this examining rather than just being told to.",
    ],
  },
  {
    id: "low-mood-vs-depression",
    category: "Mood",
    title: "Low mood vs. depression",
    summary: "Where an ordinary bad patch ends and something more starts.",
    body: [
      "Everyone has low periods -- low energy, low motivation, a flatter mood for a few days. This is a normal response to stress, poor sleep, or just a hard stretch of life.",
      "Clinical depression is different mainly in duration, intensity, and impact: symptoms most of most days, for two weeks or more, that meaningfully disrupt sleep, appetite, concentration, or the ability to function.",
      "A useful marker: does it lift with rest, a good day, or good news -- or does it persist regardless? Persistence and impact are what matter, not any single bad day.",
      "This isn't a diagnostic tool, and it isn't one. If a low mood is persistent or getting in the way of daily life, a conversation with a real mental health professional is the right next step -- not something an app can substitute for.",
    ],
  },
  {
    id: "what-sol-is-and-isnt",
    category: "How Sol works",
    title: "What Sol is -- and isn't",
    summary: "A supportive space for reflection, not a clinician.",
    body: [
      "Sol is a conversational tool designed to help you reflect, track patterns in how you're feeling, and practice grounded, evidence-based coping techniques.",
      "Sol is not a therapist, not a crisis service, and does not diagnose anything. It cannot replace professional care, and it isn't built to handle a genuine emergency.",
      "The emotion and risk signals shown during a conversation are descriptive, not clinical measurements -- rough, automated readings meant to shape what Sol says next, not a medical assessment of you.",
      "If you're ever in serious distress or immediate danger, the Crisis Help page (reachable from anywhere in the app, even before logging in) is the right place to go, not the chat.",
    ],
  },
  {
    id: "eco-anxiety",
    category: "Eco-anxiety",
    title: "What is eco-anxiety?",
    summary: "Worry about the wider state of the world -- a real, common, and separate thing.",
    body: [
      "Eco-anxiety is chronic worry or distress about environmental damage and climate change -- for the planet's future, and often for one's own. It's increasingly common, especially among people who follow the news closely or study these issues.",
      "Unlike many anxieties, the underlying threat here is real and collectively shared, not a distortion to be corrected. The goal isn't to talk someone out of caring -- it's to keep the worry from becoming so constant or overwhelming that it stops someone from functioning or finding any hope.",
      "Grounding techniques and CBT-style thought examination can still help with the intensity and constancy of the worry, even when the underlying concern is legitimate.",
      "Channeling the concern into something active -- collective action, community, small concrete steps -- is one of the most consistently reported ways people manage eco-anxiety, more so than trying to reason it away alone.",
      "A dedicated Environmental check-in space, separate from general mood tracking, is planned for Sol -- this article exists as a starting point ahead of that.",
    ],
  },
];
