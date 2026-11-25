// A small distinct back-arrow icon shared by every "back to X" button in
// the app, in place of the plain "&larr;" character -- a rounded pill
// with a chevron reads more like an intentional icon than a stray glyph.
export function BackArrow() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="back-arrow-icon"
    >
      <circle cx="10" cy="10" r="9.25" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.2" />
      <path
        d="M11.5 6.5L8 10L11.5 13.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
