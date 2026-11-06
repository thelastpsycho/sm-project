// Side-effect import: registers the Chart.js pieces every RMS chart needs
// (bar + line combo, category/linear scales, tooltip, legend). Import this once
// per chart-using component before rendering a <Chart>; registration is idempotent.

import {
  Chart as ChartJS,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(BarController, LineController, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend)

// Match the app's own font stack (base.css) so chart labels/ticks/legends/tooltips
// don't fall back to the browser default sans-serif.
ChartJS.defaults.font.family = "'Nunito Sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
