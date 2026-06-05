import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Brain, Database, Languages, RefreshCw, Search } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

import {
  getLearningStats,
  getLearningCorpus,
  getLearningCorpusStats,
  getLearningAliases,
  getLearningCorrections,
  getLearningPipeline,
  postCorrection,
} from '../../lib/api';

export const Learning = () => {
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [corpusStats, setCorpusStats] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [examples, setExamples] = useState([]);
  const [aliases, setAliases] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [search, setSearch] = useState('');
  const [correctionForm, setCorrectionForm] = useState({ original: '', corrected: '' });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, cs, p, ex, al, co] = await Promise.all([
        getLearningStats(),
        getLearningCorpusStats(),
        getLearningPipeline(),
        getLearningCorpus({ limit: 15 }),
        getLearningAliases({ limit: 20 }),
        getLearningCorrections(),
      ]);
      setStats(s);
      setCorpusStats(cs);
      setPipeline(p);
      setExamples(ex.examples || []);
      setAliases(al.aliases || []);
      setCorrections(co.corrections || []);
    } catch (e) {
      toast.error('Failed to load learning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const searchCorpus = async () => {
    try {
      const res = await getLearningCorpus({ search, limit: 20 });
      setExamples(res.examples || []);
    } catch {
      toast.error('Corpus search failed');
    }
  };

  const submitCorrection = async (e) => {
    e.preventDefault();
    if (!correctionForm.original || !correctionForm.corrected) return;
    try {
      await postCorrection(correctionForm.original, correctionForm.corrected);
      toast.success('Correction logged for adaptive learning');
      setCorrectionForm({ original: '', corrected: '' });
      loadAll();
    } catch {
      toast.error('Could not submit correction');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'corpus', label: 'Intent Corpus' },
    { id: 'aliases', label: 'Alias Browser' },
    { id: 'corrections', label: 'Corrections' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Adaptive Learning"
        subtitle="Multilingual intent corpus, alias resolution tiers, and Adaption dataset pipeline"
        action={
          <Button variant="secondary" size="sm" onClick={loadAll}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        }
      />

      <div className="flex gap-2 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold border-b-2 ${
              tab === t.id ? 'border-emerald-600 text-slate-900' : 'border-transparent text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {tab === 'overview' && (
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-5">
                <Database className="w-5 h-5 text-emerald-600 mb-2" />
                <p className="text-2xl font-bold">{corpusStats?.total_examples?.toLocaleString() || '—'}</p>
                <p className="text-xs text-slate-500">Intent examples</p>
              </Card>
              <Card className="p-5">
                <Languages className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-2xl font-bold">{corpusStats?.unique_languages || '—'}</p>
                <p className="text-xs text-slate-500">Languages covered</p>
              </Card>
              <Card className="p-5">
                <Brain className="w-5 h-5 text-violet-600 mb-2" />
                <p className="text-2xl font-bold">{stats?.aliases_total?.toLocaleString() || '—'}</p>
                <p className="text-xs text-slate-500">Commodity aliases</p>
              </Card>
              <Card className="p-5 md:col-span-3">
                <p className="text-sm font-bold mb-2">Resolution tier breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats?.tier_breakdown || {}).map(([tier, count]) => (
                    <Badge key={tier} variant="info">{tier}: {count}</Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">
                  Dataset: {pipeline?.dataset_id} · Embedding: {pipeline?.embedding_model}
                </p>
              </Card>
            </div>
          )}

          {tab === 'corpus' && (
            <Card className="p-5 space-y-4">
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Search utterances..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Button size="sm" onClick={searchCorpus}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {examples.map((ex) => (
                  <div key={ex.id} className="p-3 border rounded-lg text-sm">
                    <div className="flex gap-2 mb-1">
                      <Badge variant="success">{ex.intent}</Badge>
                      <Badge variant="neutral">{ex.utterance_language}</Badge>
                    </div>
                    <p className="text-slate-800">{ex.utterance}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === 'aliases' && (
            <Card className="p-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b">
                    <th className="py-2">Alias</th>
                    <th className="py-2">Canonical</th>
                    <th className="py-2">Language</th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.map((a) => (
                    <tr key={a.id} className="border-b border-slate-50">
                      <td className="py-2 font-medium">{a.alias}</td>
                      <td className="py-2">{a.canonical_name}</td>
                      <td className="py-2">{a.language}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {tab === 'corrections' && (
            <div className="space-y-4">
              <Card className="p-5">
                <form onSubmit={submitCorrection} className="grid md:grid-cols-3 gap-3">
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    placeholder="Original (e.g. kapas)"
                    value={correctionForm.original}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, original: e.target.value })}
                  />
                  <input
                    className="border rounded-lg px-3 py-2 text-sm"
                    placeholder="Corrected (e.g. Cotton)"
                    value={correctionForm.corrected}
                    onChange={(e) => setCorrectionForm({ ...correctionForm, corrected: e.target.value })}
                  />
                  <Button type="submit">Submit Correction</Button>
                </form>
              </Card>
              <Card className="p-5 space-y-2">
                {corrections.length === 0 ? (
                  <p className="text-sm text-slate-400">No corrections yet</p>
                ) : (
                  corrections.map((c) => (
                    <div key={c.id} className="text-sm border-b py-2">
                      <span className="text-slate-500">{c.original_value}</span>
                      <span className="mx-2">→</span>
                      <span className="font-semibold">{c.corrected_value}</span>
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Learning;
