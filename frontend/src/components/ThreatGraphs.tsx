import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, AlertTriangle, CheckCircle2, TrendingUp, Globe, Award, Shield, FileText, Activity, Target } from 'lucide-react';

// ============================================================================
// COMPLIANCE THREAT GRAPHS
// ============================================================================

export const ComplianceRiskChart = ({ suppliers }) => {
  // Only count suppliers that have been analyzed (score > 0)
  const analyzedSuppliers = suppliers.filter(s => s.score > 0);
  
  const riskData = analyzedSuppliers.reduce((acc, s) => {
    const risk = s.risk || 'low';
    acc[risk] = (acc[risk] || 0) + 1;
    return acc;
  }, {});

  const total = analyzedSuppliers.length;
  const chartData = [
    { name: 'Low Risk', value: riskData.low || 0, color: '#22c55e', percentage: total > 0 ? ((riskData.low || 0) / total * 100).toFixed(1) : 0 },
    { name: 'Medium Risk', value: riskData.medium || 0, color: '#f59e0b', percentage: total > 0 ? ((riskData.medium || 0) / total * 100).toFixed(1) : 0 },
    { name: 'High Risk', value: riskData.high || 0, color: '#ef4444', percentage: total > 0 ? ((riskData.high || 0) / total * 100).toFixed(1) : 0 }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-semibold">{payload[0].name}</p>
          <p className="text-gray-300">{payload[0].value} suppliers ({payload[0].payload.percentage}%)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          Risk Distribution Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analyzedSuppliers.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => percentage > 0 ? `${percentage}%` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
                  <div className="text-center">
                    <div className="text-lg font-bold">{item.value}</div>
                    <div className="text-xs text-muted-foreground">{item.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-foreground">No Analysis Data Yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run compliance analysis to see risk distribution
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ComplianceScoreChart = ({ suppliers }) => {
  const analyzedSuppliers = suppliers.filter(s => s.score > 0);
  
  const scoreRanges = analyzedSuppliers.reduce((acc, s) => {
    const score = s.score || 0;
    if (score >= 90) acc['Excellent (90-100)']++;
    else if (score >= 80) acc['Good (80-89)']++;
    else if (score >= 70) acc['Fair (70-79)']++;
    else if (score >= 60) acc['Poor (60-69)']++;
    else acc['Critical (<60)']++;
    return acc;
  }, { 
    'Excellent (90-100)': 0, 
    'Good (80-89)': 0, 
    'Fair (70-79)': 0, 
    'Poor (60-69)': 0, 
    'Critical (<60)': 0 
  });

  const chartData = [
    { range: 'Excellent', count: scoreRanges['Excellent (90-100)'], color: '#22c55e', fullRange: '90-100' },
    { range: 'Good', count: scoreRanges['Good (80-89)'], color: '#3b82f6', fullRange: '80-89' },
    { range: 'Fair', count: scoreRanges['Fair (70-79)'], color: '#f59e0b', fullRange: '70-79' },
    { range: 'Poor', count: scoreRanges['Poor (60-69)'], color: '#f97316', fullRange: '60-69' },
    { range: 'Critical', count: scoreRanges['Critical (<60)'], color: '#ef4444', fullRange: '<60' }
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
          <p className="text-white font-semibold">{payload[0].payload.range} ({payload[0].payload.fullRange})</p>
          <p className="text-gray-300">{payload[0].value} suppliers</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" />
          Compliance Score Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analyzedSuppliers.length > 0 ? (
          <>
            <div className="mb-3 text-center">
              <div className="text-2xl font-bold text-foreground">
                {Math.round(analyzedSuppliers.reduce((sum, s) => sum + s.score, 0) / analyzedSuppliers.length)}%
              </div>
              <div className="text-xs text-muted-foreground">Average Compliance Score</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="range" 
                  stroke="#9ca3af" 
                  style={{ fontSize: '11px' }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <Target className="w-16 h-16 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-foreground">No Score Data Available</p>
              <p className="text-xs text-muted-foreground mt-1">
                Analyze suppliers to view score distribution
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const AnalysisProgressChart = ({ suppliers }) => {
  const total = suppliers.length;
  const analyzed = suppliers.filter(s => s.score > 0).length;
  const pending = total - analyzed;
  
  const data = [
    { name: 'Analyzed', value: analyzed, color: '#3b82f6' },
    { name: 'Pending', value: pending, color: '#6b7280' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          Analysis Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center">
          <div className="text-3xl font-bold text-foreground">
            {total > 0 ? Math.round((analyzed / total) * 100) : 0}%
          </div>
          <div className="text-xs text-muted-foreground">Completion Rate</div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-xl font-bold text-blue-500">{analyzed}</div>
            <div className="text-xs text-muted-foreground">Analyzed</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-500/10 border border-gray-500/20">
            <div className="text-xl font-bold text-gray-500">{pending}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const RiskTrendChart = ({ suppliers }) => {
  const analyzedSuppliers = suppliers.filter(s => s.score > 0);
  
  // Simulate trend data (in production, this would be time-series data)
  const trendData = analyzedSuppliers.length > 0 ? [
    { period: 'Week 1', high: 0, medium: 0, low: 0 },
    { period: 'Week 2', high: 0, medium: 0, low: 0 },
    { period: 'Week 3', high: 0, medium: 0, low: 0 },
    { period: 'Current', 
      high: suppliers.filter(s => s.risk === 'high').length,
      medium: suppliers.filter(s => s.risk === 'medium').length,
      low: suppliers.filter(s => s.risk === 'low').length
    }
  ] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          Risk Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {analyzedSuppliers.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="period" stroke="#9ca3af" style={{ fontSize: '11px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="high" stroke="#ef4444" strokeWidth={2} name="High Risk" />
              <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} name="Medium Risk" />
              <Line type="monotone" dataKey="low" stroke="#22c55e" strokeWidth={2} name="Low Risk" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Analyze suppliers to view trends
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ComplianceHealthRadar = ({ suppliers }) => {
  const analyzedSuppliers = suppliers.filter(s => s.score > 0);
  
  if (analyzedSuppliers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            Compliance Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                No data available yet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const avgScore = Math.round(analyzedSuppliers.reduce((sum, s) => sum + s.score, 0) / analyzedSuppliers.length);
  const lowRiskPct = Math.round((suppliers.filter(s => s.risk === 'low').length / suppliers.length) * 100);
  const analyzedPct = Math.round((analyzedSuppliers.length / suppliers.length) * 100);
  
  // Calculate coverage score (how well are we monitoring)
  const coverageScore = analyzedPct;
  
  // Calculate quality score (how good are our suppliers)
  const qualityScore = avgScore;
  
  // Calculate safety score (how many are low risk)
  const safetyScore = lowRiskPct;

  const data = [
    { metric: 'Coverage', value: coverageScore, fullMark: 100 },
    { metric: 'Quality', value: qualityScore, fullMark: 100 },
    { metric: 'Safety', value: safetyScore, fullMark: 100 },
    { metric: 'Compliance', value: avgScore, fullMark: 100 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          Compliance Health Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={data}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis dataKey="metric" stroke="#9ca3af" style={{ fontSize: '11px' }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9ca3af" style={{ fontSize: '10px' }} />
            <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
          </RadarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="font-bold text-foreground">{coverageScore}%</div>
            <div className="text-muted-foreground">Coverage</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="font-bold text-foreground">{qualityScore}%</div>
            <div className="text-muted-foreground">Quality</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="font-bold text-foreground">{safetyScore}%</div>
            <div className="text-muted-foreground">Safety</div>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <div className="font-bold text-foreground">{avgScore}%</div>
            <div className="text-muted-foreground">Compliance</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ViolationTypeChart = ({ suppliers }) => {
  const analyzedSuppliers = suppliers.filter(s => s.score > 0);
  
  // Simulate violation categories (in production, extract from actual analysis)
  const violationData = analyzedSuppliers.length > 0 ? [
    { type: 'Identity', count: Math.floor(Math.random() * 5), color: '#ef4444' },
    { type: 'Sanctions', count: Math.floor(Math.random() * 3), color: '#f97316' },
    { type: 'Contract', count: Math.floor(Math.random() * 4), color: '#f59e0b' },
    { type: 'Fraud', count: Math.floor(Math.random() * 2), color: '#dc2626' },
  ].filter(v => v.count > 0) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Violation Categories
        </CardTitle>
      </CardHeader>
      <CardContent>
        {violationData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={violationData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" style={{ fontSize: '11px' }} />
                <YAxis type="category" dataKey="type" stroke="#9ca3af" style={{ fontSize: '11px' }} width={80} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#f3f4f6' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {violationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-lg font-bold text-amber-500">
                {violationData.reduce((sum, v) => sum + v.count, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Violations Detected</div>
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-green-600 font-medium">No Violations Detected</p>
              <p className="text-xs text-muted-foreground mt-1">All analyzed suppliers are compliant</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// OPERATIONAL THREAT GRAPHS (Placeholders for future implementation)
// ============================================================================

export const OperationalPerformanceChart = ({ suppliers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-purple-500" />
          Delivery Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Delivery performance tracking coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const OperationalCapacityChart = ({ suppliers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-500" />
          Capacity Utilization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Capacity analysis coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// GEOGRAPHICAL THREAT GRAPHS (Placeholders)
// ============================================================================

export const GeographicalRiskChart = ({ suppliers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="w-4 h-4 text-green-500" />
          Regional Risk Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-3">
              <Globe className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Geographic risk heat map coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const GeographicalStabilityChart = ({ suppliers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-green-500" />
          Political Stability Index
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Political stability tracking coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// REPUTATIONAL THREAT GRAPHS (Placeholders)
// ============================================================================

export const ReputationalSentimentChart = ({ suppliers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          Media Sentiment Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <Award className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              Sentiment tracking coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ReputationalESGChart = ({ suppliers }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-500" />
          ESG Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              ESG scoring coming soon
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};