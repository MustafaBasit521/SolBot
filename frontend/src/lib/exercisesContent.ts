// Static, hand-written content -- deliberately not AI-generated. These are
// standard, widely-published techniques (box breathing, 5-4-3-2-1
// grounding, CBT thought records) rather than anything novel or clinical
// advice specific to a person, which keeps this safe to serve verbatim
// with no model in the loop and no risk of a hallucinated instruction.

export interface Exercise {
  id: string;
  category: "Breathing" | "Grounding" | "CBT worksheet";
  title: string;
  summary: string;
  steps: string[];
}

export const EXERCISES: Exercise[] = [
  {
    id: "box-breathing",
    category: "Breathing",
    title: "Box breathing",
    summary: "A steady four-part breath used to calm the nervous system quickly.",
    steps: [
      "Breathe in slowly through your nose for a count of 4.",
      "Hold that breath for a count of 4.",
      "Breathe out slowly through your mouth for a count of 4.",
      "Hold with empty lungs for a count of 4.",
      "Repeat for 4-8 rounds, or as long as feels helpful.",
    ],
  },
  {
    id: "4-7-8-breathing",
    category: "Breathing",
    title: "4-7-8 breathing",
    summary: "A longer exhale than inhale, which can help the body settle before sleep or in a stressful moment.",
    steps: [
      "Breathe in quietly through your nose for a count of 4.",
      "Hold the breath for a count of 7.",
      "Exhale completely through your mouth for a count of 8, making a soft whoosh sound.",
      "Repeat for 3-4 rounds to start -- more can feel lightheaded at first.",
    ],
  },
  {
    id: "5-4-3-2-1-grounding",
    category: "Grounding",
    title: "5-4-3-2-1 senses",
    summary: "Uses your five senses to bring attention back to the present moment.",
    steps: [
      "Name 5 things you can see around you right now.",
      "Name 4 things you can physically feel (the chair, your clothes, the air).",
      "Name 3 things you can hear.",
      "Name 2 things you can smell (or two smells you like).",
      "Name 1 thing you can taste, or are grateful for.",
    ],
  },
  {
    id: "physical-grounding",
    category: "Grounding",
    title: "Physical grounding",
    summary: "A quick way to reconnect with your body when thoughts are racing.",
    steps: [
      "Feel your feet flat on the floor. Notice the contact point.",
      "Press your palms together firmly for 5 seconds, then release.",
      "Name out loud (or in your head) where you are right now, and today's date.",
      "Take one slow breath before continuing with what you were doing.",
    ],
  },
  {
    id: "thought-record",
    category: "CBT worksheet",
    title: "Thought record",
    summary: "A structured way to examine a difficult thought, from cognitive behavioral therapy.",
    steps: [
      "Situation: What happened, briefly and factually?",
      "Automatic thought: What went through your mind? Write it as a specific sentence.",
      "Emotion: Name the feeling, and rate its intensity 0-100%.",
      "Evidence for the thought: What actually supports it being true?",
      "Evidence against the thought: What doesn't fit, or points another way?",
      "Balanced thought: Given both sides, what's a more balanced way to see it?",
      "Re-rate the emotion: How intense does it feel now, 0-100%?",
    ],
  },
  {
    id: "cognitive-distortions",
    category: "CBT worksheet",
    title: "Common thinking traps",
    summary: "A checklist of patterns ('cognitive distortions') that CBT identifies as often distorting how a situation feels.",
    steps: [
      "All-or-nothing thinking: seeing things in only two extreme categories, with no middle ground.",
      "Catastrophizing: assuming the worst possible outcome will happen.",
      "Mind reading: assuming you know what others are thinking, usually something negative about you.",
      "Overgeneralization: seeing a single negative event as a never-ending pattern.",
      "Should statements: holding rigid rules for yourself or others that create unnecessary guilt or frustration.",
      "Try this: next time a thought feels overwhelming, check if it matches one of these -- naming the pattern can loosen its grip a little.",
    ],
  },
];
