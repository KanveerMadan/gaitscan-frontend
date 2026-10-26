// Optional floor calibration (backend gaitcore/calibration.py): two points on the floor along the
// walking line, a known distance apart, marked on a frame of the video. Points are sent in the video's
// own pixels. Step length and walking speed from it are labelled "not yet validated" by the API.
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CalibrationStep({ file, onAnalyse, onCancel }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const [size, setSize] = useState(null); // video pixels
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState("");

  const mark = (e) => {
    if (!size) return;
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const p = {
      x: Math.round(((e.clientX - r.left) / r.width) * size.width),
      y: Math.round(((e.clientY - r.top) / r.height) * size.height),
    };
    setPoints((prev) => (prev.length >= 2 ? [p] : [...prev, p]));
  };

  const metres = Number(distance);
  const ready = points.length === 2 && metres > 0;

  return (
    <Card aria-label="Floor calibration" role="region">
      <CardHeader>
        <CardTitle>Mark two points on the floor</CardTitle>
        <CardDescription>
          Tap two marks on the floor along the walking line (for example two pieces of tape), as far apart as
          possible, then enter the distance between them. Tap again to start over.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div
          data-testid="calibration-surface"
          onClick={mark}
          className="relative cursor-crosshair overflow-hidden rounded-md bg-foreground leading-none"
        >
          <video
            data-testid="calibration-video"
            src={url}
            muted
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => {
              setSize({ width: e.currentTarget.videoWidth, height: e.currentTarget.videoHeight });
              e.currentTarget.currentTime = 0.5;
            }}
            className="pointer-events-none w-full"
          />
          {size &&
            points.map((p, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute -ml-2 -mt-2 size-4 rounded-full border-2 border-white bg-primary"
                style={{ left: `${(p.x / size.width) * 100}%`, top: `${(p.y / size.height) * 100}%` }}
              />
            ))}
        </div>
        <p className="text-xs text-muted-foreground">{points.length} of 2 points marked</p>
        <div className="grid max-w-48 gap-2">
          <Label htmlFor="calibration-distance">Distance between the points (metres)</Label>
          <Input
            id="calibration-distance"
            type="number"
            min="0.2"
            max="50"
            step="0.01"
            className="tabular"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            disabled={!ready}
            onClick={() =>
              onAnalyse({
                calib_x1: points[0].x,
                calib_y1: points[0].y,
                calib_x2: points[1].x,
                calib_y2: points[1].y,
                calib_distance_m: metres,
              })
            }
          >
            Analyse with calibration
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
