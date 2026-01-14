import app from '../server.js';

// Esta é a "ponte" que liga o Vercel ao teu server.js
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export default async function handler(req, res) {
	res.setHeader('Content-Type', 'application/json')
	try {
		if (req.method === 'GET') {
			const { user_id, limit = 100 } = req.query || {}
			let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(Number(limit))
			if (user_id) query = query.eq('user_id', user_id)
			const { data, error } = await query
			if (error) return res.status(500).json({ error: error.message })
			return res.status(200).json({ data })
		}

		if (req.method === 'POST') {
			const payload = req.body || {}
			if (!payload.amount || !payload.expense_date || !payload.user_id) {
				return res.status(400).json({ error: 'Missing required fields: amount, expense_date, user_id' })
			}
			const { data, error } = await supabase.from('expenses').insert([payload]).select().single()
			if (error) return res.status(500).json({ error: error.message })
			return res.status(201).json({ data })
		}

		res.setHeader('Allow', 'GET,POST')
		return res.status(405).json({ error: 'Method Not Allowed' })
	} catch (e) {
		return res.status(500).json({ error: e.message || String(e) })
	}
}
export default app;