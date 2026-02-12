import type { MessagesSchema } from 'payload-intl';

export const messages = {
  navigation: {
    main: {
      academy: 'Academy',
      award: 'Award',
      network: {
        page: 'Network',
        influencers: 'Influencers',
        events: 'Events',
        campaigns: 'Campaigns',
        agencies: 'Agencies',
      },
      convention: 'Convention',
    },
    sub: {
      contact: 'Contact us',
      'nomination-process': 'Nomination Process',
      imprint: 'Imprint',
      sponsoring: 'Sponsoring',
      privacy: 'Privacy',
    },
    aria: { langSwitch: 'Switch language', navigateTo: 'Navigate to {target}' },
  },
  landing: {
    meta: {
      title: 'Swiss Influence',
      description:
        'We connect thought leaders and influential brands, celebrate their stories, and offer education for lasting impact.',
    },
    headline:
      'We <Flip>connect,celebrate,educate</Flip><Static>People and Brands of Influence</Static> ',
    links: {
      network: 'Network',
      award: 'Award',
      academy: 'Academy',
      forum: 'Convention',
    },
  },
  award: {
    hero: {
      default: { title: 'AWARD {year} ', CTA: 'Stay Tuned' },
      announced: { headline: 'Coming Soon' },
      nomination: { headline: 'Open for Nomination', CTA: 'Apply' },
      'nomination-ended': { headline: 'Voting starting soon', CTA: 'Nominees' },
      'voting-countdown': { headline: 'Get ready to vote' },
      voting: { headline: 'Voting open', CTA: 'Vote Now' },
      'between-votings': { headline: 'New voting round coming up' },
      'voting-ended': { headline: 'Counting the Votes' },
      'pre-show': { CTA: 'Join the Show' },
      'during-show': { headline: 'We are live' },
      'show-countdown': { CTA: 'Join the Show' },
      'post-show': { headline: 'Winners announced soon' },
      awarded: { headline: 'The winners took it all', CTA: 'All Winners' },
      finished: { headline: 'It was a blast!', CTA: 'Impressions' },
    },
    show: { title: 'Join the show', linkLabel: 'Show' },
    nomination: {
      title: 'Nomination',
      linkLabel: 'Nomination',
      description:
        "<p><strong>Win a Smile Swiss Influence Award!</strong></p><p>Are you an influencer, creator, or a brand that inspires people? Whether you're active in entertainment, travel, beauty, lifestyle, or other areas – this is your chance to win an award!</p><p>The <strong>Smile Swiss Influence Award</strong> is looking for authentic personalities and innovative brands that captivate with their ideas and community.</p><p>Simply sign up here and show us why you should be part of it. With a bit of luck, you’ll make it to the <strong>Top 10</strong> and get the chance to stand on the big stage in <strong>October 2025</strong> in front of more than <strong>3200 spectators</strong>.</p><p><strong>What are you waiting for?</strong></p>",
      CTA: 'Apply Now',
    },
    'newcomer-scout': {
      linkLabel: 'Newcomer Scout',
      CTA: 'Apply now',
      info: 'Info',
      perks: 'Perks',
      timeline: 'Timeline',
    },
    'creator-challenges': {
      title: 'Creator Challenges',
      linkLabel: 'Creator Challenges',
      description:
        '<p>Mit deiner Teilnahme an den Creator x Brands Challenges hast du die einmalige Chance, eine Wildcard für die Top 10 einer der All-Stars-Kategorien zu gewinnen!</p><p>Schau dir die teilnehmenden Brands unten an und bewirb dich für eine oder mehrere Brand Challenges. Nach deiner Annahme erhältst du ein Briefing sowie ein exklusives Goodie, mit dem du kreativen Content erstellst. Diesen postest du anschliessend auf deinen Instagram- oder TikTok-Kanälen.</p><p>Die besten Beiträge werden zusätzlich über die SSIA-Kanäle gefeatured – so erhältst du noch mehr Reichweite! Die Gewinner: innen jeder Challenge sichern sich die begehrte Wildcard für die jeweilige All-Star Kategorie - krass!</p><p>Die Challenges laufen ab sofort bis August 2025. Nutze diese Gelegenheit für garantierte Sichtbarkeit, wertvolle Kontakte und einzigartige Chancen für deine Zukunft!</p>',
      labels: { current: 'Current Challenges', past: 'Past Challenges' },
    },
    categories: {
      title: 'Nominees {year} ',
      linkLabel: 'Nominees',
      sponsoredBy: 'Sponsored by {brand}',
      'view-nominees': 'All nominees',
    },
    jury: { title: 'Meet the jury', linkLabel: 'Jury' },
    impressions: {
      current: { title: 'Impressions', linkLabel: 'Impressions' },
      past: { title: 'This was {year} ', linkLabel: 'Throwback' },
      afterMovie: 'Aftermovie 2025',
    },
    hallOfFame: {
      title: 'Hall of Fame',
      linkLabel: 'Hall of Fame',
      ranking: {
        first: 'Winner',
        second: 'Second place',
        third: 'Third place',
        other: '{rank}th place',
      },
      aria: { next: 'Show next nominee', previous: 'Show previous nominee' },
    },
  },
  voting: {
    CTA: 'Vote now',
    selection: {
      instructions: "Select all the Nominees you'd like to vote for.",
      submit: 'Submit Votes',
      reset: 'Start over',
      intro: {
        title: 'Make Your Vote Count',
        message:
          '<p>Before submitting your vote, scroll through the entire list and select every candidate you want to vote for. You can pick <strong>as many as you want</strong>, but once you hit submit, your selection is final.</p><p></p><p><em>Keep in mind: submitting votes multiple times for the same influencer won’t increase their count.</em></p>',
        CTA: 'Let’s Go',
      },
    },
    form: {
      title: 'Thank you for voting!',
      placeholders: {
        firstName: 'First name',
        lastName: 'Last name',
        email: 'Email',
      },
      subaddressWarning:
        'We recognize email aliases as the same email, so you can submit one vote per account.',
      disclaimer:
        'In order for your votes to be valid, you will need to confirm your email.',
      newsletter: 'Stay updated on the latest news and events',
      submit: 'Submit',
      cancel: 'Back to selection',
      validation: {
        tooShort: 'Min. {min} chars',
        tooLong: 'Min. {max} chars',
        emailInvalid: 'Invalid email',
      },
    },
    submission: {
      title: 'VOTES SUBMITTED',
      message:
        'Your votes have been submitted successfully. Please check your email for to confirm your votes.',
      close: 'Got it',
    },
    confirmation: {
      title: 'VOTING CONFIRMED',
      message: 'Your votes have been confirmed. Thank you for participating!',
      close: 'Continue exploring',
    },
  },
  network: {
    hero: { title: 'Network', headline: 'The 360° platform for the industry' },
    links: {
      influencers: 'Influencers',
      campaigns: 'Barter Deal Campaigns',
      events: 'Events',
      agencies: 'Agencies',
      whatsapp: 'Whatsapp',
    },
  },
  influencers: {
    title: 'Certified People of Influence Register & Finder',
    certification: { title: 'Get certified' },
    discovery: {
      title: 'Our Certified People of Influence',
    },
    profile: {
      age: 'years old',
      'based-in': 'Based in',
      speaks: 'Speaks',
      'cooperation-interests': 'Collab areas',
      'other-interests': 'Further interests',
    },
  },
  campaigns: {
    title: 'Barter Deal Campaigns ',
    headline: 'Are you looking for really cool collabs?',
    request: {
      title: 'Write out your campaign with us',
      message: 'Are you a brand and looking for creators?',
      CTA: 'Get in touch',
    },
    labels: { current: 'Current Campaigns', past: 'Past Campaigns' },
  },
  agencies: {
    title: 'Agency Register',
    headline: 'Get an overview of the Swiss Agency World',
    'list-title': 'Our Agency Partners',
    'contact-CTA': 'Contact Us',
  },
  events: {
    titles: {
      awardShow: 'Smile Swiss Influence Awardshow',
      convention: 'Creator Convention',
    },
    page: {
      title: 'Event Calendar',
      headline: 'Find the best events across Switzerland',
      empty:
        'No upcoming events at the moment, but stay tuned for exciting things ahead!',
    },
    event: {
      'register-cta': 'BUY TICKET',
      'slot-from': 'From {time}',
      'slot-until': 'Until {time}',
      'sold-out': 'Sold Out',
      'date-tbd': 'Bald angekündigt',
      'sale-not-open': 'Presale starts soon',
    },
  },
  convention: {
    hero: {
      title: 'Creator Convention ',
      headline:
        'Werde Teil der Creator Convention und nimm am grössten Business- und Entertainment-Event des Jahres teil',
      CTA: 'More Info',
    },
    title: 'Come join us',
    content:
      '<h2><strong>The Biggest Business and Entertainment Event in Switzerland</strong></h2><p>Dive into the world of innovation, creativity, and networking. <strong>Creator Convention</strong> is THE event that connects brands, creators, and their communities. Be part of Switzerland’s largest stage for business and entertainment and experience a unique blend of inspiration, networking, and interactivity.</p><h3><strong>Why Join?</strong></h3><h4><strong>Connect and Collaborate</strong></h4><p>Meet leading brands, up-and-coming creators, and passionate communities. Exchange ideas, build valuable connections, and explore new collaboration opportunities.</p><h4><strong>Showcase Your Brand</strong></h4><p>Companies can secure their own exhibition spaces to present products and services directly to an engaged audience. Let your brand shine in a dynamic and interactive environment.</p><h4><strong>Engage with Your Community</strong></h4><p>Gain direct access to your target audience. From exciting workshops and interactive booths to live product demonstrations, create meaningful interactions and make your brand memorable.</p><h4><strong>Sell Your Products Live</strong></h4><p>Depending on your package, take the opportunity to sell your products on-site. Inspire your audience and offer them a unique shopping experience.</p><h3><strong>Event Highlights</strong></h3><h4><strong>Keynotes &amp; Panel Discussions</strong></h4><p>Hear from industry leaders, visionaries, and creators who are shaping the future of business and entertainment.</p><h4><strong>Workshops &amp; Masterclasses</strong></h4><p>Dive deep into hands-on sessions that equip you with the tools and insights to thrive in today’s creator economy.</p><h4><strong>Interactive Networking Zones</strong></h4><p>Foster connections in a dynamic, collaborative space designed for meaningful conversations.</p><h4><strong>Product Showcases &amp; Demos</strong></h4><p>Witness the latest innovations and trends as brands and creators unveil their groundbreaking products and ideas.</p><p>This is your chance to be part of a movement that transforms business, creativity, and community engagement. Don’t miss out on the <strong>Creator Convention</strong>, where the brightest minds and boldest ideas come together!</p>',
  },
  academy: {
    hero: {
      title: 'Academy',
      headline: 'Training to become an HWZ-certified Content Creator',
      CTA: 'Find out more',
    },
  },
  newsletter: {
    description: 'Our newsletter always provides you with the latest updates',
    CTA: 'Sign Up',
    title: 'Stay tuned',
    placeholders: {
      firstName: 'First name',
      lastName: 'Last name',
      email: 'Email',
    },
    submit: 'Subscribe',
  },
  misc: {
    'close-modal': 'Close',
    'social-link': 'Navigate to {platform}',
    'more-social-links': 'Show more social links',
    'time-left': '{timeLeft} left',
  },
} satisfies MessagesSchema;
