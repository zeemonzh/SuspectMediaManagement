import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all product keys
export async function GET() {
  try {
    const { data: keys, error } = await supabase
      .from('product_keys')
      .select(`
        *,
        streamers!assigned_to(
          id,
          username,
          tiktok_username
        ),
        product_categories!category_id(
          id,
          name,
          description
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(keys)
  } catch (error) {
    console.error('Error fetching product keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product keys' },
      { status: 500 }
    )
  }
}

// POST - Add new product key
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, category_id } = body

    if (!key || !key.trim()) {
      return NextResponse.json(
        { error: 'Key is required' },
        { status: 400 }
      )
    }

    if (!category_id || !category_id.trim()) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      )
    }

    // Check if key already exists
    const { data: existingKey } = await supabase
      .from('product_keys')
      .select('id')
      .eq('key', key.trim())
      .single()

    if (existingKey) {
      return NextResponse.json(
        { error: 'Key already exists' },
        { status: 409 }
      )
    }

    // Verify the category exists first
    const { data: categoryExists, error: categoryError } = await supabase
      .from('product_categories')
      .select('id, name')
      .eq('id', category_id.trim())
      .single()

    if (categoryError) {
      console.error('Error checking category:', categoryError)
      if (categoryError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Product categories table does not exist. Please run migrations.' },
          { status: 500 }
        )
      }
      throw categoryError
    }

    if (!categoryExists) {
      return NextResponse.json(
        { error: 'Selected category does not exist' },
        { status: 400 }
      )
    }

    // Insert new key
    const insertData = {
      key: key.trim(),
      category_id: category_id.trim(),
      product_name: categoryExists.name || 'Unknown', // For backwards compatibility
      is_assigned: false,
      created_at: new Date().toISOString()
    }

    console.log('Inserting key data:', insertData)

    const { data: newKey, error } = await supabase
      .from('product_keys')
      .insert(insertData)
      .select(`
        *,
        product_categories!category_id(
          id,
          name,
          description
        )
      `)
      .single()

    if (error) {
      console.error('Database error inserting key:', error)
      throw error
    }

    return NextResponse.json(newKey, { status: 201 })
  } catch (error) {
    console.error('Error creating product key:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorCode = (error as any)?.code || 'Unknown'
    return NextResponse.json(
      { error: `Failed to create product key: ${errorMessage} (Code: ${errorCode})` },
      { status: 500 }
    )
  }
}

// DELETE - Delete a product key
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      )
    }

    // Delete the key
    const { error: deleteError } = await supabase
      .from('product_keys')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Key deleted successfully' })
  } catch (error) {
    console.error('Error deleting product key:', error)
    return NextResponse.json(
      { error: 'Failed to delete product key' },
      { status: 500 }
    )
  }
} 