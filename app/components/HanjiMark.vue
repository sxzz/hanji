<template>
  <!--
    The two regional forms share one footprint, then the anti-diagonal cut
    reveals where they disagree. Paths are outlined so the brand never
    depends on a font finishing its download.
  -->
  <svg
    viewBox="0 0 100 100"
    aria-hidden="true"
    focusable="false"
    class="block shrink-0"
  >
    <defs>
      <clipPath id="hanji-mark-tile" clipPathUnits="userSpaceOnUse">
        <rect width="100" height="100" rx="23.5" />
      </clipPath>
      <clipPath id="hanji-mark-simplified" clipPathUnits="userSpaceOnUse">
        <path d="M0 0h100L0 100Z" />
      </clipPath>
      <clipPath id="hanji-mark-traditional" clipPathUnits="userSpaceOnUse">
        <path d="M100 0v100H0Z" />
      </clipPath>
    </defs>

    <rect class="mark-tile" width="100" height="100" rx="23.5" />

    <g clip-path="url(#hanji-mark-tile)">
      <g clip-path="url(#hanji-mark-simplified)">
        <path
          class="mark-simplified"
          transform="translate(15 76.5) scale(0.07 -0.07)"
          d="M105 217C94 217 59 217 59 217L59 199C81 197 98 192 113 182C137 165 141 63 120 -43C130 -84 160 -96 186 -96C242 -96 282 -59 283 -5C286 89 239 119 237 178C236 205 243 243 251 279C263 337 323 565 359 688L344 692C161 277 161 277 137 238C126 217 121 217 105 217ZM30 613L23 608C56 568 92 506 104 448C226 369 330 598 30 613ZM117 842L110 837C142 793 178 728 190 667C317 581 430 819 117 842ZM577 201C501 90 405 -6 285 -81L294 -91C434 -39 544 30 631 113C687 33 754 -33 831 -91C863 -26 920 13 987 14L993 26C896 73 802 133 719 210C827 349 887 512 923 682C950 685 961 689 968 702L843 817L769 740L339 740L348 712L432 712C457 497 506 332 577 201ZM637 299C549 406 482 541 449 712L778 712C752 567 706 426 637 299Z"
        />
      </g>

      <g clip-path="url(#hanji-mark-traditional)">
        <path
          class="mark-traditional"
          transform="translate(15 76.5) scale(0.07 -0.07)"
          d="M75 215C64 215 29 215 29 215L29 197C50 195 68 190 82 180C107 163 111 63 90 -43C100 -83 129 -96 155 -96C210 -96 250 -59 252 -5C255 87 208 118 206 176C205 202 213 240 221 275C235 332 299 555 337 677L323 681C132 274 132 274 108 236C96 215 91 215 75 215ZM77 841L70 836C102 795 140 733 153 676C275 598 377 826 77 841ZM30 621L22 616C51 576 78 516 81 460C192 373 311 586 30 621ZM661 855L661 746L561 746L561 813C589 817 596 827 598 841L435 855L435 746L292 746L300 718L435 718L435 614L458 614C490 614 522 619 542 624L542 558L468 558L337 608L337 318L354 318C405 318 462 345 462 356L462 381L542 381L542 339L541 292L324 292L332 264L539 264C536 233 531 204 523 176L285 176L293 148L513 148C476 55 397 -20 234 -85L239 -94C494 -45 603 42 649 148L661 148C702 29 769 -44 888 -90C900 -18 935 28 986 44L987 55C874 61 756 92 690 148L945 148C959 148 970 153 973 164C927 204 850 262 850 262L783 176L659 176C669 204 674 234 677 264L903 264C917 264 928 269 930 280C902 304 862 334 838 352C872 359 906 371 907 376L907 513C924 517 934 524 939 531L819 619L762 558L680 558L680 619L685 619C736 619 791 632 791 638L791 718L951 718C965 718 975 723 978 734C940 771 875 825 875 825L818 746L791 746L791 813C818 817 826 827 828 841ZM797 347L752 292L679 292L680 340L680 381L771 381L771 347L795 347ZM771 409L680 409L680 530L771 530ZM542 409L462 409L462 530L542 530ZM561 654L561 718L661 718L661 654Z"
        />
      </g>

      <g class="mark-registration" fill="none">
        <path
          d="M100 0 0 100"
          vector-effect="non-scaling-stroke"
          stroke-width="1.4"
          opacity="0.25"
        />
        <path
          d="M90.243 18.243 81.757 9.757M18.243 90.243 9.757 81.757"
          vector-effect="non-scaling-stroke"
          stroke-width="2.4"
          opacity="0.35"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.mark-tile {
  fill: var(--c-ink);
}

.mark-simplified {
  fill: var(--c-paper);
}

.mark-traditional {
  fill: var(--c-g1);
}

.mark-registration {
  stroke: var(--c-paper);
}
</style>
