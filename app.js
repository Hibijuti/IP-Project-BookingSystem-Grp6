import { initSharedComponents } from './src/components.js';
import {
  initNavigation,
  initPackageRowSelectors,
  initHeroProductGallery
} from './src/ui.js';
import { initVisualizers } from './src/visualizer.js';
import { initCarousel } from './src/carousel.js';
import { initCalendar } from './src/calendar.js';
import { initVenueMap } from './src/map.js';
import { initBookingForm } from './src/booking.js';

document.addEventListener('DOMContentLoaded', () => {
  initSharedComponents();
  initNavigation();
  initVisualizers();
  initPackageRowSelectors();
  initHeroProductGallery();
  initCarousel();
  initCalendar();
  initVenueMap();
  initBookingForm();
});
