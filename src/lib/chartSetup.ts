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
