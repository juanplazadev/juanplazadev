// The 45° arrow that sits in the corner of a card whose whole surface is a link.
// Was copy-pasted into post-card.tsx and OpenSource.tsx; the architecture cards
// would have made a third.
export default function ArrowIcon() {
    return (
        <svg
            className="fill-current"
            xmlns="http://www.w3.org/2000/svg"
            width="10"
            height="10"
            aria-hidden="true"
        >
            <path d="M1.018 10 0 8.983l7.572-7.575H1.723L1.736 0H10v8.266H8.577l.013-5.841L1.018 10Z" />
        </svg>
    );
}
