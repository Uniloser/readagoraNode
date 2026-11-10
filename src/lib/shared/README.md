These modules are bundled inside the website so a deployment of the
`readagora.com` directory does not depend on sibling repository folders.

They mirror the root `shared/site-ad-svg.js`, its type declarations, and
`shared/story-competitions.js`. When changing those shared implementations,
update these website copies too. Website tests exercise the bundled copies.
