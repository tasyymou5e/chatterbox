import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Trash2, Radio } from 'lucide-react';
import { useErrorCapture } from '@/hooks/useErrorCapture';

export const ErrorCapture = () => {
  const { errors, isCapturing, startCapture, stopCapture, clearErrors } = useErrorCapture();

  const typeColor: Record<string, string> = {
    runtime: 'bg-red-600',
    'unhandled-rejection': 'bg-orange-600',
    network: 'bg-amber-600',
  };

  const typeStats = errors.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {isCapturing ? (
              <Button onClick={stopCapture} variant="outline" size="sm" className="border-red-600 text-red-400 hover:bg-red-600/20">
                <Square className="h-4 w-4 mr-1" /> Stop Capture
              </Button>
            ) : (
              <Button onClick={startCapture} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Play className="h-4 w-4 mr-1" /> Start Capture
              </Button>
            )}
            <Button onClick={clearErrors} variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Trash2 className="h-4 w-4 mr-1" /> Clear
            </Button>
            {isCapturing && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Radio className="h-4 w-4 animate-pulse" /> Listening for errors...
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {Object.entries(typeStats).map(([type, count]) => (
              <Badge key={type} className={typeColor[type] ?? 'bg-gray-600'}>
                {type}: {count}
              </Badge>
            ))}
            {errors.length > 0 && (
              <Badge className="bg-gray-600">Total: {errors.length}</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error feed */}
      {errors.length === 0 ? (
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center text-gray-500">
            {isCapturing
              ? 'No errors captured yet. Errors will appear here in real-time.'
              : 'Click "Start Capture" to begin listening for frontend errors.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-auto">
          {errors.map((err) => (
            <Card key={err.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`${typeColor[err.type] ?? 'bg-gray-600'} text-xs`}>
                      {err.type}
                    </Badge>
                    <CardTitle className="text-white text-sm font-mono">{err.message}</CardTitle>
                  </div>
                  <span className="text-gray-500 text-xs whitespace-nowrap">
                    {new Date(err.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {err.source && (
                  <CardDescription className="text-gray-500 text-xs font-mono">
                    {err.source}
                    {err.lineno != null && `:${err.lineno}`}
                    {err.colno != null && `:${err.colno}`}
                  </CardDescription>
                )}
              </CardHeader>
              {err.stack && (
                <CardContent className="px-4 pb-3 pt-0">
                  <pre className="text-green-400 bg-gray-900 p-2 rounded text-xs overflow-auto max-h-24 whitespace-pre-wrap">
                    {err.stack}
                  </pre>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
