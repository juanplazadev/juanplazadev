{{--
  The résumé email.

  Table layout and inline styles on purpose: this has to survive Outlook, which
  ignores <style> blocks in the head, strips classes, and does not do flexbox.
  Everything here is 2005 HTML for that reason - do not "modernise" it.

  Colours are literal hex rather than the site's CSS custom properties, which no
  mail client resolves. They are the Ember palette (the default) converted from
  the oklch values in resources/css/additional-styles/palettes.css:
  accent-700 #a03c12, neutral-900 #1d1713, neutral-500 #797068,
  neutral-200 #e9e4de, neutral-100 #f6f2ed, neutral-50 #fcf9f6.
  The wordmark is text, exactly as resources/js/components/wordmark.tsx renders
  it - the site has no logo image to attach.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>The résumé you asked for</title>
</head>
<body style="margin:0; padding:0; background-color:#f6f2ed; -webkit-font-smoothing:antialiased;">
    {{-- Preheader: the grey line an inbox shows after the subject. Hidden in the
         body itself by the zero dimensions. --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        Thanks for asking - here it is, plus the short version of what I do.
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f2ed;">
        <tr>
            <td align="center" style="padding:32px 16px;">

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#fcf9f6; border:1px solid #e9e4de; border-radius:16px;">

                    {{-- Header. The accent rule stands in for the hero's glow,
                         which no client would render. --}}
                    <tr>
                        <td style="height:3px; line-height:3px; font-size:0; background-color:#a03c12; border-radius:16px 16px 0 0;">&nbsp;</td>
                    </tr>
                    <tr>
                        <td style="padding:32px 32px 0 32px;">
                            <span style="font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:16px; font-weight:600; letter-spacing:-0.02em; color:#1d1713;">juanplaza<span style="color:#a03c12;">.dev</span></span>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:24px 32px 0 32px;">
                            <h1 style="margin:0; font-family:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:26px; line-height:1.2; font-weight:700; letter-spacing:-0.02em; color:#1d1713;">
                                Here&rsquo;s the r&eacute;sum&eacute;
                            </h1>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:16px 32px 0 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#1d1713;">
                            <p style="margin:0 0 16px 0;">
                                Thanks for asking. I&rsquo;m a software engineer who owns production
                                systems end to end &mdash; data model to deploy &mdash; mostly in
                                Laravel, Spring Boot and React with TypeScript.
                            </p>
                            <p style="margin:0 0 16px 0;">
                                Eight years of it has been inside regulated environments: HIPAA
                                healthcare, then defense and government contracts in a SOX-audited
                                public company. That shaped how I build &mdash; least privilege,
                                auditable by default, hardened before it ships.
                            </p>
                            <p style="margin:0;">
                                If any of that looks like a fit, just reply to this email.
                            </p>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 32px 0 32px;">
                            {{-- Bulletproof-ish button: a table cell with the
                                 background, not a styled <a>, so Outlook fills it. --}}
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" style="background-color:#a03c12; border-radius:999px;">
                                        <a href="{{ route('home') }}" style="display:inline-block; padding:12px 28px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none;">
                                            See the work
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:28px 32px 32px 32px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td style="border-top:1px solid #e9e4de; padding-top:20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#797068;">
                                        You&rsquo;re getting this because <strong style="color:#1d1713; font-weight:600;">{{ $delivery->email }}</strong>
                                        was entered on <a href="{{ route('home') }}" style="color:#a03c12; text-decoration:none;">juanplaza.dev</a>.
                                        It isn&rsquo;t on a list and there&rsquo;s no follow-up sequence &mdash;
                                        this is the only email you&rsquo;ll get.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>
</body>
</html>
