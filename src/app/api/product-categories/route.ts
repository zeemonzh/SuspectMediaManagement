import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch all product categories
export async function GET() {
  try {
    const { data: categories, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching product categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product categories' },
      { status: 500 }
    )
  }
}

// POST - Create new product category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check if category already exists
    const { data: existingCategory } = await supabase
      .from('product_categories')
      .select('id')
      .eq('name', name.trim())
      .single()

    if (existingCategory) {
      return NextResponse.json(
        { error: 'Category already exists' },
        { status: 409 }
      )
    }

    // Insert new category
    const { data: newCategory, error } = await supabase
      .from('product_categories')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error('Error creating product category:', error)
    return NextResponse.json(
      { error: 'Failed to create product category' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a product category
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id || !id.trim()) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check if category has any keys assigned to it
    const { data: keysWithCategory, error: keysError } = await supabase
      .from('product_keys')
      .select('id')
      .eq('category_id', id)

    if (keysError) throw keysError

    if (keysWithCategory && keysWithCategory.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. ${keysWithCategory.length} keys are assigned to this category.` },
        { status: 400 }
      )
    }

    // Check if category has any pending requests
    const { data: requestsWithCategory, error: requestsError } = await supabase
      .from('key_requests')
      .select('id')
      .eq('category_id', id)
      .eq('status', 'pending')

    if (requestsError) throw requestsError

    if (requestsWithCategory && requestsWithCategory.length > 0) {
      return NextResponse.json(
        { error: `Cannot delete category. ${requestsWithCategory.length} pending requests reference this category.` },
        { status: 400 }
      )
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Error deleting product category:', error)
    return NextResponse.json(
      { error: 'Failed to delete product category' },
      { status: 500 }
    )
  }
} 