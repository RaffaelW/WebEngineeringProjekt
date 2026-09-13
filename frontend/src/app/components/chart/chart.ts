import { formatCurrency } from "@angular/common";
import {
  AfterViewInit,
  Component,
  ElementRef,
  input,
  InputSignal,
  OnChanges,
  OnDestroy,
  output,
  OutputEmitterRef,
  Signal,
  viewChild,
} from "@angular/core";
import { MatButtonToggleModule } from "@angular/material/button-toggle";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import ApexCharts, { ApexOptions } from "apexcharts";
import type { TimeFrameKey } from "../../../../../models/history.d.ts";
import { timeFrameKeys, timeFrameLabels, WindowKey, windowKeys } from "../../lib/timeframe";
import { ChartData, ChartPoint } from "../../pages/dashboard-page/dashboard-page";

// x-axis
type Series = { name: string; data: [number, number][] }[];
type DataOptions = Required<Pick<ApexOptions, "series" | "tooltip">>;

@Component({
  selector: "price-chart",
  imports: [MatCardModule, MatButtonToggleModule, MatIconModule, MatProgressBarModule],
  templateUrl: "./chart.html",
  styleUrl: "./chart.scss",
})
export class Chart implements OnChanges, AfterViewInit, OnDestroy {
  // owned by the parent page, the chart only draws it
  readonly data: InputSignal<ChartData> = input.required<ChartData>();

  // fired when the user picks another window or timeframe
  readonly windowChange: OutputEmitterRef<WindowKey> = output<WindowKey>();
  readonly timeframeChange: OutputEmitterRef<TimeFrameKey> = output<TimeFrameKey>();

  protected readonly windowKeys: WindowKey[] = windowKeys;
  protected readonly timeFrameKeys: TimeFrameKey[] = timeFrameKeys;
  protected readonly timeFrameLabels: Record<TimeFrameKey, string> = timeFrameLabels;

  private readonly chartHost: Signal<ElementRef<HTMLDivElement>> =
    viewChild.required<ElementRef<HTMLDivElement>>("chartHost");
  private chart: ApexCharts | null = null;

  ngOnChanges(): void {
    this.chart?.updateOptions(this.toDataOptions());
  }

  ngAfterViewInit(): void {
    this.chart = new ApexCharts(this.chartHost().nativeElement, this.buildOptions());
    this.chart.render();
  }

  // ApexCharts registers a window resize listener, so it must be torn down explicitly
  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  private toSeries(points: ChartPoint[]): Series {
    return [
      {
        name: "Value",
        data: points.map((point: ChartPoint) => [point.time.getTime(), point.value]),
      } /*
      {
        name: "Invested",
        data: bars.map((bar: PortfolioBar) => [bar.time.getTime(), bar.invested]),
      }, */,
    ];
  }

  private toDataOptions(): DataOptions {
    const { points, timeframe } = this.data();
    const intraday: boolean = timeframe === "1min" || timeframe === "1h";
    return {
      series: this.toSeries(points),
      tooltip: { x: { format: intraday ? "dd MMM yyyy HH:mm" : "dd MMM yyyy" } },
    };
  }

  private formatEuro(value: number): string {
    return formatCurrency(value, "de", "€", "EUR");
  }

  private buildOptions(): ApexOptions {
    const data: DataOptions = this.toDataOptions();
    return {
      series: data.series,
      chart: {
        height: "100%",
        // the zoom tool has to stay enabled for drag-zoom to work, its icon is hidden in the scss
        toolbar: {
          tools: {
            download: true,
            selection: false,
            zoom: true,
            pan: false,
            zoomin: true,
            zoomout: true,
            reset: true,
          },
          autoSelected: "zoom",
        },
        zoom: { type: "x", autoScaleYaxis: true },
      },
      colors: ["#006874", "#6f797a"],
      stroke: { width: [2, 1], dashArray: [0, 4] },
      // top padding keeps the toolbar row clear of the plot
      grid: { borderColor: "#bec8c9", padding: { top: 24 } },
      // legend on the left so it never collides with the toolbar on the right
      legend: { position: "top", horizontalAlign: "left" },
      xaxis: { type: "datetime", labels: { datetimeUTC: false } },
      yaxis: { labels: { formatter: (value: number) => this.formatEuro(value) } },
      tooltip: {
        x: data.tooltip.x,
        y: { formatter: (value: number) => this.formatEuro(value) },
      },
    };
  }
}
