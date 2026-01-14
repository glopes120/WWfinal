import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

export default async function handler(req, res) {
	res.setHeader('Content-Type', 'application/json')
	try {
		// normalize path
		const path = req.url || ''

		if (req.method === 'GET' && path.startsWith('/api/status')) {
			return res.status(200).json({ status: 'online', message: 'API serverless OK' })
		}

		if (req.method === 'GET' && path.startsWith('/api/expenses')) {
			const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
			const params = Object.fromEntries(url.searchParams.entries())
			const {
				user_id,
				min_amount,
				max_amount,
				start_date,
				end_date,
				category_id,
				currency,
				description_like,
				limit = 100,
				offset = 0,
				order_by = 'expense_date',
				order_dir = 'desc'
			} = params

			let query = supabase.from('expenses').select('*')
			if (user_id) query = query.eq('user_id', user_id)
			if (category_id) query = query.eq('category_id', category_id)
			if (currency) query = query.eq('currency', currency)
			if (min_amount) query = query.gte('amount', Number(min_amount))
			if (max_amount) query = query.lte('amount', Number(max_amount))
			if (start_date) query = query.gte('expense_date', start_date)
			if (end_date) query = query.lte('expense_date', end_date)
			if (description_like) query = query.ilike('description', `%${description_like}%`)

			query = query.order(order_by, { ascending: order_dir.toLowerCase() === 'asc' })
			query = query.range(Number(offset), Number(offset) + Number(limit) - 1)

			const { data, error } = await query
			if (error) return res.status(500).json({ error: error.message })
			return res.status(200).json({ data })
		}

		if (req.method === 'POST' && path.startsWith('/api/expenses')) {
			let body = ''
			for await (const chunk of req) body += chunk
			const payload = body ? JSON.parse(body) : {}
			if (!payload.amount || !payload.expense_date || !payload.user_id) {
				return res.status(400).json({ error: 'Missing required fields: amount, expense_date, user_id' })
			}
			const { data, error } = await supabase.from('expenses').insert([payload]).select().single()
			if (error) return res.status(500).json({ error: error.message })
			return res.status(201).json({ data })
		}

		res.setHeader('Allow', 'GET,POST')
		return res.status(404).json({ error: 'Not Found' })
	} catch (e) {
		return res.status(500).json({ error: e.message || String(e) })
	}
}