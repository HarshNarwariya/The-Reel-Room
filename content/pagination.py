from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator

PAGE_SIZE_ALBUMS = 12
PAGE_SIZE_MEDIA = 20
PAGE_SIZE_RESUME = 20
PAGE_SIZE_HISTORY = 20


def paginate(request, queryset, per_page, page_param="page"):
    paginator = Paginator(queryset, per_page)
    page_number = request.GET.get(page_param, 1)
    try:
        return paginator.page(page_number)
    except PageNotAnInteger:
        return paginator.page(1)
    except EmptyPage:
        return paginator.page(paginator.num_pages)
