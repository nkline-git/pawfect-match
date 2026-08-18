'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Upload, Download, Loader2, X, AlertTriangle, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BULK_IMPORT_HEADERS, parseBulkImportRows, type BulkImportRow, type BulkImportError } from '@/lib/bulkImportPets'
import type { Rescue } from '@/types'

const TEMPLATE_ROWS = [
  ['Buddy', 'dog', 'Golden Retriever', '2 yrs', 'Male', 'Large', 'Loves fetch and belly rubs.', '150', 'Friendly, House-trained', ''],
  ['Whiskers', 'cat', 'Domestic Shorthair', '6 months', 'Female', 'Small', '', '75', 'Playful, Good with kids', 'https://example.com/whiskers.jpg'],
]

function downloadTemplate() {
  const csv = Papa.unparse({ fields: [...BULK_IMPORT_HEADERS], data: TEMPLATE_ROWS })
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'pawfect-match-animals-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'preview'; fileName: string; valid: BulkImportRow[]; errors: BulkImportError[] }
  | { kind: 'importing'; fileName: string; valid: BulkImportRow[]; errors: BulkImportError[] }
  | { kind: 'done'; imported: number }
  | { kind: 'parse-error'; message: string }

export default function BulkImportPets({
  rescue, onImported, onClose,
}: {
  rescue: Rescue
  onImported: () => void
  onClose: () => void
}) {
  const [supabase] = useState(createClient)
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })

  const handleFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: results => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setStage({ kind: 'parse-error', message: `Couldn't read that file as CSV: ${results.errors[0].message}` })
          return
        }
        const { valid, errors } = parseBulkImportRows(results.data)
        setStage({ kind: 'preview', fileName: file.name, valid, errors })
      },
      error: err => setStage({ kind: 'parse-error', message: err.message }),
    })
  }

  const runImport = async () => {
    if (stage.kind !== 'preview' || stage.valid.length === 0) return
    setStage({ ...stage, kind: 'importing' })

    const { error } = await supabase.from('pets').insert(
      stage.valid.map(p => ({
        rescue_id:   rescue.id,
        name:        p.name,
        species:     p.species,
        breed:       p.breed,
        age:         p.age,
        gender:      p.gender,
        size:        p.size,
        description: p.description,
        fee:         p.fee,
        traits:      p.traits,
        photos:      p.photos,
        good_with:   [],
        status:      'available' as const,
      }))
    )

    if (error) {
      setStage({ kind: 'preview', fileName: stage.fileName, valid: stage.valid, errors: [
        ...stage.errors,
        { row: 0, name: '', message: `Import failed: ${error.message}` },
      ] })
      return
    }

    await supabase.from('rescues').update({
      stats: { ...rescue.stats, animals: rescue.stats.animals + stage.valid.length },
    }).eq('id', rescue.id)

    setStage({ kind: 'done', imported: stage.valid.length })
    onImported()
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">Import animals from a spreadsheet</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      {stage.kind === 'idle' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">
            Have your animals listed in Excel, Google Sheets, or Numbers? Export
            it as a CSV (File → Download/Export → CSV) and upload it here —
            every animal in the sheet gets added at once.
          </p>
          <button
            onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Download size={14} />
            Download a CSV template with the right columns
          </button>
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#e05a4e] hover:bg-red-50/30 transition-all">
            <Upload size={22} className="text-gray-400 mb-1.5" />
            <span className="text-xs text-gray-500 font-medium">Click to upload your CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
      )}

      {stage.kind === 'parse-error' && (
        <div className="space-y-3">
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
            {stage.message}
          </div>
          <button
            onClick={() => setStage({ kind: 'idle' })}
            className="w-full py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Try another file
          </button>
        </div>
      )}

      {(stage.kind === 'preview' || stage.kind === 'importing') && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{stage.fileName}</p>

          {stage.valid.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-green-800 mb-1">
                {stage.valid.length} animal{stage.valid.length === 1 ? '' : 's'} ready to import
              </p>
              <p className="text-xs text-green-700 truncate">
                {stage.valid.slice(0, 6).map(p => p.name).join(', ')}
                {stage.valid.length > 6 ? `, +${stage.valid.length - 6} more` : ''}
              </p>
            </div>
          )}

          {stage.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1">
                <AlertTriangle size={12} />
                {stage.errors.length} row{stage.errors.length === 1 ? '' : 's'} skipped — fix these in your
                spreadsheet and re-upload, or import the rest now
              </p>
              <ul className="text-xs text-amber-700 space-y-0.5 max-h-32 overflow-y-auto">
                {stage.errors.map((e, i) => (
                  <li key={i}>{e.row > 0 ? `Row ${e.row + 1}${e.name ? ` (${e.name})` : ''}: ` : ''}{e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {stage.valid.length === 0 && stage.errors.length === 0 && (
            <p className="text-xs text-gray-500">That file didn&apos;t have any animal rows in it.</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStage({ kind: 'idle' })}
              disabled={stage.kind === 'importing'}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Choose a different file
            </button>
            <button
              onClick={runImport}
              disabled={stage.valid.length === 0 || stage.kind === 'importing'}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#e05a4e' }}
            >
              {stage.kind === 'importing' && <Loader2 size={14} className="animate-spin" />}
              Import {stage.valid.length || ''} animal{stage.valid.length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {stage.kind === 'done' && (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <Check size={22} className="text-green-600" />
          </div>
          <p className="text-sm font-semibold text-gray-900 mb-1">
            {stage.imported} animal{stage.imported === 1 ? '' : 's'} imported!
          </p>
          <p className="text-xs text-gray-500 mb-4">
            They&apos;re live in your listings now. Rows without a photo URL show
            with a placeholder — duplicate a listing to add photos individually.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#e05a4e' }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
