<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Hiring Mode
    |--------------------------------------------------------------------------
    |
    | Turns the availability signalling on the landing page on and off: the
    | status dot on the hero avatar, the "Open to remote roles" badge beside
    | it, and the opening line of the Contact card. The work history, the stats
    | row, and the resume button are not affected - those stand on their own.
    |
    | Read server side, so with this off the copy never reaches the browser.
    | Defaults to false: a missing variable should fail quiet, not broadcast.
    |
    */

    'hiring' => (bool) env('SITE_HIRING_MODE', false),

];
